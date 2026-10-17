import { z } from "zod";
import { preferencesSchema } from "@/lib/validation";
import { parseProvider, parseProviderText, providerJson, requiredEnv } from "./http";

const memorySchema = z.object({ id: z.string(), content: z.string().max(2000) });
export const savePreferencesSchema = z.object({ consent: z.literal(true), preferences: preferencesSchema }).strict();

/** One explicitly configured demo user's memory. No client-chosen assistant/user IDs.
 * Replace this mapping with authenticated per-user ownership before multi-user release.
 */
export function createPreferenceStore(fetcher: typeof fetch = fetch) {
  function config() {
    const assistant = encodeURIComponent(requiredEnv("BACKBOARD_ASSISTANT_ID"));
    const memory = encodeURIComponent(requiredEnv("BACKBOARD_PREFERENCES_MEMORY_ID"));
    return {
      url: `https://app.backboard.io/api/assistants/${assistant}/memories/${memory}`,
      headers: { "X-API-Key": requiredEnv("BACKBOARD_API_KEY"), "Content-Type": "application/json" },
    };
  }
  return {
    async read() {
      const { url, headers } = config();
      const memory = parseProvider(memorySchema, await providerJson(url, { headers }, fetcher));
      return parseProviderText(preferencesSchema, memory.content);
    },
    async save(input: unknown) {
      const { preferences } = savePreferencesSchema.parse(input);
      const { url, headers } = config();
      const memory = parseProvider(memorySchema, await providerJson(url, {
        method: "PUT", headers, body: JSON.stringify({ content: JSON.stringify(preferences), metadata: { kind: "touchpoint_preferences_v1" } }),
      }, fetcher));
      return parseProviderText(preferencesSchema, memory.content);
    },
    async remove() {
      const { url, headers } = config();
      await providerJson(url, { method: "DELETE", headers }, fetcher);
      return { deleted: true };
    },
  };
}
