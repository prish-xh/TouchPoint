import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPerceptronClient } from "@/lib/perceptron";
import { suggestRoutine } from "@/lib/server/gemini";
import { createPreferenceStore } from "@/lib/server/backboard";
import { endpoint, readJson } from "@/lib/server/http";
import { POST as scanRoute } from "@/app/api/scan/route";
import { POST as verifyRoute } from "@/app/api/verify/route";

const frame = { captureId: "capture-1", dataUrl: "data:image/png;base64,aGVsbG8=" };
const request = { applianceId: "microwave", routineId: "set_30_seconds", frame };
const box = { controlId: "digit_3", x: 0.1, y: 0.2, w: 0.1, h: 0.1 };
const preferences = { speechRate: 0.8, instructionDetail: "brief", appVoice: true };
function transport(body: unknown, status = 200) {
  return vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(body), { status }));
}
function completion(body: unknown, finish = "stop") {
  return { choices: [{ finish_reason: finish, message: { content: JSON.stringify(body) } }] };
}
function detection(body: { controls: Array<{ controlId: string; x: number; y: number; w: number; h: number }> }, finish = "complete") {
  return { finish_reason: finish, detections: body.controls.map((c) => ({
    mention: `button labeled ${c.controlId === "digit_3" ? "3" : c.controlId}`,
    point_box: { top_left: { x: c.x * 100, y: c.y * 100 }, bottom_right: { x: (c.x + c.w) * 100, y: (c.y + c.h) * 100 } },
  })) };
}
beforeEach(async () => {
  frame.dataUrl = "data:image/png;base64," + (await sharp({ create: { width: 100, height: 100, channels: 3, background: "white" } }).png().toBuffer()).toString("base64");
  for (const name of ["PERCEPTRON_API_KEY", "PERCEPTRON_MODEL", "GEMINI_API_KEY", "GEMINI_MODEL", "BACKBOARD_API_KEY", "BACKBOARD_ASSISTANT_ID", "BACKBOARD_PREFERENCES_MEMORY_ID", "TOUCHPOINT_DEMO_TOKEN"]) vi.stubEnv(name, "test-only");
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("Perceptron adapter", () => {
  it("uses documented endpoint and auth, returns normalized observations without approving simulated guidance", async () => {
    const fetcher = transport(detection({ controls: [box] }));
    const result = await createPerceptronClient(fetcher).scan(request);
    expect(result.controls).toHaveLength(1);
    expect(result.controls[0]).toMatchObject({ controlId: "digit_3", label: "3" });
    for (const key of ["x", "y", "w", "h"] as const) expect(result.controls[0][key]).toBeCloseTo(box[key]);
    expect(result.panelReady).toBe(false);
    expect(result.captureId).toBe(frame.captureId);
    expect(result.missingControls).toEqual(["digit_0", "start"]);
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe("https://api.perceptron.inc/v1/detect");
    expect(init?.headers).toMatchObject({ Authorization: "Bearer test-only" });
    expect(JSON.parse(String(init?.body)).config.output).toBe("box");
  });
  it("omits unknown and ambiguous duplicate controls", async () => {
    const result = await createPerceptronClient(transport(detection({ controls: [box, box, { ...box, controlId: "invented" }] }))).scan(request);
    expect(result.controls).toEqual([]);
  });
  it.each([
    detection({ controls: [box] }, "length"),
    { choices: [{ finish_reason: "stop", message: { content: "not JSON" } }] },
  ])("rejects malformed or incomplete provider output", async (body) => {
    await expect(createPerceptronClient(transport(body)).scan(request)).rejects.toMatchObject({ code: "INVALID_PROVIDER_RESPONSE" });
  });
  it("never turns OCR into a confirmed action without checked rules", async () => {
    const result = await createPerceptronClient(transport(completion({ readable: true, displayText: "0:30" }))).verify({ ...request, stepId: "press_0" });
    expect(result).toMatchObject({ result: "uncertain", observed: "0:30", stepId: "press_0", captureId: frame.captureId });
  });
  it("does not expose unreadable text", async () => {
    const result = await createPerceptronClient(transport(completion({ readable: false, displayText: "guess" }))).verify({ ...request, stepId: "press_3" });
    expect(result.observed).toBeNull();
  });
  it("rejects unsupported steps before calling the provider", async () => {
    const fetcher = transport({});
    await expect(createPerceptronClient(fetcher).verify({ ...request, stepId: "invented" })).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("fails closed when a key is missing", async () => {
    vi.stubEnv("PERCEPTRON_API_KEY", "");
    const fetcher = transport({});
    await expect(createPerceptronClient(fetcher).scan(request)).rejects.toMatchObject({ code: "NOT_CONFIGURED" });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("sanitizes provider and timeout errors", async () => {
    for (const fetcher of [transport({ secret: "sensitive" }, 429), vi.fn<typeof fetch>().mockRejectedValue(new Error("sensitive"))]) {
      await expect(createPerceptronClient(fetcher).scan(request)).rejects.toMatchObject({ code: "PROVIDER_FAILURE" });
    }
  });
});

describe("Gemini routine selection", () => {
  function gemini(ids: unknown) { return transport({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify(ids) }] } }] }); }
  it("returns only a catalog choice and requires confirmation", async () => {
    const result = await suggestRoutine({ intent: "Set 30 seconds on the microwave" }, gemini({ applianceId: "microwave", routineId: "set_30_seconds" }));
    expect(result).toMatchObject({ routineId: "set_30_seconds", requiresConfirmation: true, simulated: true });
    expect(result).not.toHaveProperty("steps");
  });
  it("rejects hallucinated routines", async () => {
    const result = await suggestRoutine({ intent: "Turn on a burner" }, gemini({ applianceId: "stove", routineId: "heat" }));
    expect(result.routineId).toBeNull();
  });
  it("does not treat a blocked response as a suggestion", async () => {
    await expect(suggestRoutine({ intent: "anything" }, transport({ candidates: [] }))).rejects.toMatchObject({ code: "INVALID_PROVIDER_RESPONSE" });
  });
});

describe("Backboard preference memory", () => {
  it("requires explicit consent before sending preferences", async () => {
    const fetcher = transport({});
    await expect(createPreferenceStore(fetcher).save({ consent: false, preferences })).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("persists only approved preference fields to the configured record", async () => {
    const fetcher = transport({ id: "record", content: JSON.stringify(preferences) });
    expect(await createPreferenceStore(fetcher).save({ consent: true, preferences })).toEqual(preferences);
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe("https://app.backboard.io/api/assistants/test-only/memories/test-only");
    expect(init?.method).toBe("PUT");
    expect(JSON.parse(JSON.parse(String(init?.body)).content)).toEqual(preferences);
  });
  it("reads preferences across independent store instances", async () => {
    const fetcher = transport({ id: "record", content: JSON.stringify(preferences) });
    expect(await createPreferenceStore(fetcher).read()).toEqual(preferences);
  });
  it("rejects camera images or user identifiers in memory payload", async () => {
    const fetcher = transport({});
    await expect(createPreferenceStore(fetcher).save({ consent: true, preferences: { ...preferences, frame } })).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("supports explicit deletion", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }));
    expect(await createPreferenceStore(fetcher).remove()).toEqual({ deleted: true });
    expect(fetcher.mock.calls[0][1]?.method).toBe("DELETE");
  });
});

describe("route boundaries", () => {
  it("blocks unauthenticated paid API calls", async () => {
    const action = vi.fn();
    const response = await endpoint(new Request("http://localhost/api/scan"), action);
    expect(response.status).toBe(401);
    expect(action).not.toHaveBeenCalled();
  });
  it("rejects oversized streams", async () => {
    await expect(readJson(new Response("x".repeat(101)).body, 100)).rejects.toMatchObject({ code: "BODY_TOO_LARGE" });
  });
  it("returns sanitized request errors rather than echoed frames", async () => {
    const response = await scanRoute(new Request("http://localhost/api/scan", { method: "POST", headers: { Authorization: "Bearer test-only" }, body: JSON.stringify({ ...request, frame: { ...frame, dataUrl: "https://private-host/image" } }) }));
    expect(response.status).toBe(400);
    expect(await response.text()).not.toContain("private-host");
  });
  it("serves valid OCR responses via the verify route", async () => {
    vi.stubGlobal("fetch", transport(completion({ readable: true, displayText: "0:03" })));
    const response = await verifyRoute(new Request("http://localhost/api/verify", { method: "POST", headers: { Authorization: "Bearer test-only" }, body: JSON.stringify({ ...request, stepId: "press_3" }) }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ result: "uncertain" });
  });
});
