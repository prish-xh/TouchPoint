import { describe, expect, expectTypeOf, it } from "vitest";
import { createMockApiClient } from "@/lib/api-client";
import { APPLIANCES } from "@/lib/catalog";
import type { FrontendTaskController } from "@/types/touchpoint";
import type { TaskController as ExistingContract } from "@/components/mock/contract";

const request = {
  applianceId: "microwave", routineId: "set_30_seconds",
  frame: { dataUrl: "data:image/jpeg;base64,ZGVtbw==", captureId: "capture-1" },
};

describe("shared foundation", () => {
  it("preserves the frontend contract structurally", () => {
    expectTypeOf<FrontendTaskController>().toEqualTypeOf<ExistingContract>();
  });
  it("scans every required control using normalized fixture coordinates", async () => {
    const response = await createMockApiClient().scan(request);
    expect(response.captureId).toBe(request.frame.captureId);
    expect(response.panelReady).toBe(true);
    expect(response.missingControls).toEqual([]);
    for (const control of response.controls) {
      expect(control.x).toBeGreaterThanOrEqual(0);
      expect(control.y).toBeGreaterThanOrEqual(0);
      expect(control.w).toBeGreaterThan(0);
      expect(control.h).toBeGreaterThan(0);
      expect(control.x + control.w).toBeLessThanOrEqual(1);
      expect(control.y + control.h).toBeLessThanOrEqual(1);
    }
    for (const step of APPLIANCES[0].routines[0].steps) {
      expect(response.controls.some((c) => c.controlId === step.controlId)).toBe(true);
      const result = await createMockApiClient().verify({ ...request, stepId: step.id });
      expect(result).toMatchObject({ result: "matched", stepId: step.id, captureId: "capture-1" });
      expect(result.observed).toBeTruthy();
    }
  });
  it.each([
    ["success", "matched"], ["wrong_setting", "mismatched"],
    ["unreadable", "uncertain"], ["missed_press", "mismatched"],
  ] as const)("returns %s without mutating a routine", async (scenario, result) => {
    const before = JSON.stringify(APPLIANCES);
    const response = await createMockApiClient(scenario).verify({ ...request, stepId: "press_3" });
    expect(response.result).toBe(result);
    expect(response.observed === null).toBe(scenario === "unreadable");
    expect(JSON.stringify(APPLIANCES)).toBe(before);
  });
  it("does not mark an unreadable scan ready", async () => {
    const response = await createMockApiClient("unreadable").scan(request);
    expect(response.panelReady).toBe(false);
    expect(response.controls).toEqual([]);
    expect(response.missingControls).toEqual(["digit_3", "digit_0", "start"]);
  });
  it("rejects simulated API failures for both operations", async () => {
    const client = createMockApiClient("api_failure");
    await expect(client.scan(request)).rejects.toMatchObject({ code: "API_FAILURE" });
    await expect(client.verify({ ...request, stepId: "press_3" })).rejects.toMatchObject({ code: "API_FAILURE" });
  });
  it("rejects unsupported selections and missing capture identifiers", async () => {
    const client = createMockApiClient();
    for (const invalid of [
      { ...request, applianceId: "laundry" },
      { ...request, routineId: "missing" },
      { ...request, frame: { ...request.frame, captureId: "" } },
    ]) await expect(client.scan(invalid)).rejects.toMatchObject({ code: "INVALID_REQUEST" });
    await expect(client.verify({ ...request, stepId: "missing" })).rejects.toMatchObject({ code: "INVALID_REQUEST" });
  });
  it("isolates clients and fresh response objects", async () => {
    const client = createMockApiClient();
    const scan = await client.scan(request);
    scan.controls[0].x = 99;
    expect((await client.scan(request)).controls[0].x).not.toBe(99);
    await createMockApiClient("wrong_setting").verify({ ...request, stepId: "press_3" });
    expect((await client.verify({ ...request, stepId: "press_3" })).result).toBe("matched");
  });
});

describe("HTTP adapter", () => {
  it("rejects stale verification before a controller can consume it", async () => {
    const { createHttpApiClient } = await import("@/lib/api-client");
    const fetcher = (async () => Response.json({ captureId: "old", stepId: "press_3", result: "matched", observed: "0:03", message: "OK" })) as typeof fetch;
    await expect(createHttpApiClient("private-demo-token", fetcher).verify({ ...request, stepId: "press_3" })).rejects.toThrow("Stale");
  });
  it("accepts validated matching responses", async () => {
    const { createHttpApiClient } = await import("@/lib/api-client");
    const fetcher = (async () => Response.json({ captureId: "capture-1", stepId: "press_3", result: "uncertain", observed: null, message: "Cannot confirm" })) as typeof fetch;
    expect((await createHttpApiClient("private-demo-token", fetcher).verify({ ...request, stepId: "press_3" })).result).toBe("uncertain");
  });
  it("rejects malformed scan coordinates", async () => {
    const { createHttpApiClient } = await import("@/lib/api-client");
    const fetcher = (async () => Response.json({ captureId: "capture-1", panelReady: true, missingControls: [], message: "OK", controls: [{ controlId: "digit_3", label: "3", x: 0.9, y: 0, w: 0.5, h: 0.1 }] })) as typeof fetch;
    await expect(createHttpApiClient("private-demo-token", fetcher).scan(request)).rejects.toThrow();
  });
});
