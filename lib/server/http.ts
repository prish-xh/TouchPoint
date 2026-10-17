import { timingSafeEqual } from "node:crypto";
import { z } from "zod";

export class ServiceError extends Error {
  constructor(public code: string, public status: number, message: string) { super(message); }
}
export function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new ServiceError("NOT_CONFIGURED", 503, `${name} is not configured.`);
  return value;
}
// All paid-provider routes are private demo endpoints until real user auth exists.
export function authorize(request: Request) {
  const expected = requiredEnv("TOUCHPOINT_DEMO_TOKEN");
  const actual = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  const a = Buffer.from(actual), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new ServiceError("UNAUTHORIZED", 401, "A demo access token is required.");
  }
}
export async function readJson(stream: ReadableStream<Uint8Array> | null, limit: number): Promise<unknown> {
  if (!stream) throw new ServiceError("INVALID_JSON", 400, "JSON body required.");
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new ServiceError("BODY_TOO_LARGE", 413, "Request or response exceeds the size limit.");
      }
      chunks.push(value);
    }
    try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
    catch { throw new ServiceError("INVALID_JSON", 400, "Invalid JSON body."); }
  } finally { reader.releaseLock(); }
}
export async function providerJson(url: string, init: RequestInit, fetcher: typeof fetch = fetch, timeoutMs = 20000): Promise<unknown> {
  try {
    const response = await fetcher(url, { ...init, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error("provider failure");
    }
    if (response.status === 204) return null;
    return await readJson(response.body, 128 * 1024);
  } catch {
    // Never expose provider bodies, credentials, image contents, or transport errors.
    throw new ServiceError("PROVIDER_FAILURE", 502, "The service could not complete the request. Try again.");
  }
}
export function parseProvider<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new ServiceError("INVALID_PROVIDER_RESPONSE", 502, "The service returned an unusable result.");
  return result.data;
}
export function parseProviderText<T>(schema: z.ZodType<T>, text: string): T {
  let value: unknown;
  try { value = JSON.parse(text); }
  catch { throw new ServiceError("INVALID_PROVIDER_RESPONSE", 502, "The service returned an unusable result."); }
  return parseProvider(schema, value);
}
export async function endpoint(request: Request, action: () => Promise<unknown>) {
  try {
    authorize(request);
    return Response.json(await action(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const known = error instanceof ServiceError;
    const validation = error instanceof z.ZodError;
    return Response.json({ error: {
      code: known ? error.code : validation ? "INVALID_REQUEST" : "INTERNAL_ERROR",
      message: known ? error.message : validation ? "Request fields are invalid." : "Unable to complete the request.",
    } }, { status: known ? error.status : validation ? 400 : 500, headers: { "Cache-Control": "no-store" } });
  }
}
