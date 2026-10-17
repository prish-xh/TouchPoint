import { describe, expect, it, vi } from "vitest";
import { createTaskEngine } from "@/lib/task-engine";
import { createMockApiClient } from "@/lib/api-client";
import type { Frame, PerceptionClient, ScanResponse, VerifyResponse, FrontendTaskController } from "@/types/touchpoint";
import type { useTaskController } from "@/hooks/useTaskController";
import { expectTypeOf } from "vitest";

let capture = 0;
const frame = (): Frame => ({ dataUrl: "demo-image", captureId: `capture-${++capture}` });
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
async function ready(client: PerceptionClient = createMockApiClient()) {
  const engine = createTaskEngine(client);
  engine.selectRoutine("microwave", "set_30_seconds");
  await engine.scanFrame(frame());
  engine.startGuidance();
  return engine;
}
function match(f: Frame, stepId = "press_3"): VerifyResponse {
  return { captureId: f.captureId, stepId, result: "matched", observed: "0:03", message: "Matched" };
}

describe("routine transitions", () => {
  it("preserves the frontend hook contract", () => {
    expectTypeOf<ReturnType<typeof useTaskController>>().toEqualTypeOf<FrontendTaskController>();
  });
  it("requires panel readiness and explicit start", async () => {
    const engine = createTaskEngine(createMockApiClient());
    engine.startGuidance();
    expect(engine.getSnapshot().status).toBe("idle");
    engine.selectRoutine("microwave", "set_30_seconds");
    engine.startGuidance();
    expect(engine.getSnapshot().status).toBe("scanning");
    await engine.scanFrame(frame());
    expect(engine.getSnapshot()).toMatchObject({ status: "scanning", panelReady: true });
    engine.startGuidance();
    expect(engine.getSnapshot().status).toBe("guiding");
  });
  it("reaching a target does not confirm a press", async () => {
    const engine = await ready();
    engine.reportTargetReached();
    expect(engine.getSnapshot()).toMatchObject({ status: "on_target", stepIndex: 0, lastResult: null });
  });
  it("each matched check advances exactly once and completion clears the target", async () => {
    const engine = await ready();
    for (let i = 1; i <= 3; i++) {
      await engine.checkAction(frame());
      expect(engine.getSnapshot().stepIndex).toBe(i);
    }
    expect(engine.getSnapshot()).toMatchObject({ status: "done", step: null, targetControl: null, busy: false });
    await engine.checkAction(frame());
    engine.resume(); engine.reportCameraMoved(); engine.reportTargetReached();
    expect(engine.getSnapshot().stepIndex).toBe(3);
  });
  it.each(["unreadable", "wrong_setting", "api_failure"] as const)("%s cannot advance", async (scenario) => {
    const client = { ...createMockApiClient(), verify: createMockApiClient(scenario).verify };
    const engine = await ready(client);
    await engine.checkAction(frame());
    expect(engine.getSnapshot().stepIndex).toBe(0);
    expect(engine.getSnapshot().status).toBe(scenario === "wrong_setting" ? "paused" : "retry");
    expect(engine.getSnapshot().busy).toBe(false);
  });
  it("tracking return cannot override a manual pause", async () => {
    const engine = await ready();
    engine.pause(); engine.reportTrackingLost();
    expect(engine.getSnapshot().pauseReason).toBe("user");
  });
  it("resumes tracking loss on the same step without confirming a press", async () => {
    const engine = await ready();
    engine.reportTargetReached(); engine.reportTrackingLost();
    expect(engine.getSnapshot().pauseReason).toBe("tracking_lost");
    engine.resume();
    expect(engine.getSnapshot()).toMatchObject({ status: "guiding", stepIndex: 0 });
  });
  it("requires rescan after camera movement, including while manually paused", async () => {
    const engine = await ready();
    await engine.checkAction(frame());
    engine.pause(); engine.reportCameraMoved(); engine.resume();
    expect(engine.getSnapshot()).toMatchObject({ status: "scanning", panelReady: false, targetControl: null, stepIndex: 1 });
    await engine.checkAction(frame());
    expect(engine.getSnapshot().stepIndex).toBe(1);
    await engine.scanFrame(frame());
    expect(engine.getSnapshot()).toMatchObject({ status: "guiding", panelReady: true, stepIndex: 1 });
  });
  it("stops auto-scanning once setup has a ready panel", async () => {
    const scan = vi.fn(createMockApiClient().scan);
    const engine = createTaskEngine({ ...createMockApiClient(), scan });
    engine.selectRoutine("microwave", "set_30_seconds");
    await engine.scanFrame(frame()); await engine.scanFrame(frame());
    expect(scan).toHaveBeenCalledTimes(1);
  });
  it("invalid selection clears the previous task", async () => {
    const engine = await ready();
    engine.selectRoutine("missing", "missing");
    expect(engine.getSnapshot()).toMatchObject({ status: "idle", routine: null });
  });
  it("reset clears progression, map, and verification", async () => {
    const engine = await ready(); await engine.checkAction(frame()); engine.reset();
    expect(engine.getSnapshot()).toMatchObject({ status: "idle", appliance: null, routine: null, stepIndex: 0, controls: [], lastResult: null });
  });
});

describe("concurrency and stale results", () => {
  it("prevents overlapping checks and capture reuse", async () => {
    const pending = deferred<VerifyResponse>();
    const verify = vi.fn(() => pending.promise);
    const engine = await ready({ ...createMockApiClient(), verify });
    const f = frame();
    const work = engine.checkAction(f);
    await engine.checkAction(frame());
    expect(verify).toHaveBeenCalledTimes(1);
    pending.resolve(match(f)); await work;
    await engine.checkAction(f);
    expect(verify).toHaveBeenCalledTimes(1);
    expect(engine.getSnapshot().stepIndex).toBe(1);
  });
  it.each(["pause", "reset", "select", "camera", "cleanup"])("ignores verification after %s", async (action) => {
    const pending = deferred<VerifyResponse>();
    const engine = await ready({ ...createMockApiClient(), verify: () => pending.promise });
    const f = frame(); const work = engine.checkAction(f);
    if (action === "pause") { engine.pause(); engine.resume(); }
    if (action === "reset") engine.reset();
    if (action === "select") engine.selectRoutine("microwave", "set_30_seconds");
    if (action === "camera") engine.reportCameraMoved();
    if (action === "cleanup") engine.cancelPending();
    pending.resolve(match(f)); await work;
    expect(engine.getSnapshot().stepIndex).toBe(0);
    expect(engine.getSnapshot().lastResult).toBeNull();
    expect(engine.getSnapshot().busy).toBe(false);
  });
  it("does not start a new transport while an invalidated call is still pending", async () => {
    const pending = deferred<VerifyResponse>();
    const scan = vi.fn(createMockApiClient().scan);
    const engine = await ready({ scan, verify: () => pending.promise });
    const f = frame(); const work = engine.checkAction(f);
    engine.reset(); engine.selectRoutine("microwave", "set_30_seconds");
    await engine.scanFrame(frame());
    expect(scan).toHaveBeenCalledTimes(1);
    pending.resolve(match(f)); await work;
    await engine.scanFrame(frame());
    expect(scan).toHaveBeenCalledTimes(2);
  });
  it("late failures cannot overwrite reset state", async () => {
    const pending = deferred<VerifyResponse>();
    const engine = await ready({ ...createMockApiClient(), verify: () => pending.promise });
    const work = engine.checkAction(frame()); engine.reset();
    pending.reject(new Error("secret provider body")); await work;
    expect(engine.getSnapshot()).toMatchObject({ status: "idle", busy: false });
    expect(engine.getSnapshot().message).not.toContain("secret");
  });
  it("ignores scans completed after pause, even after resume", async () => {
    const pending = deferred<ScanResponse>();
    const engine = createTaskEngine({ ...createMockApiClient(), scan: () => pending.promise });
    engine.selectRoutine("microwave", "set_30_seconds");
    const f = frame(); const work = engine.scanFrame(f);
    engine.pause(); engine.resume();
    pending.resolve(await createMockApiClient().scan({ applianceId: "microwave", routineId: "set_30_seconds", frame: f }));
    await work;
    expect(engine.getSnapshot()).toMatchObject({ status: "scanning", panelReady: false, controls: [] });
  });
});

describe("response validation", () => {
  it.each(["capture", "step", "shape"])("rejects invalid verification %s", async (kind) => {
    const engine = await ready({ ...createMockApiClient(), verify: async ({ frame: f }) => {
      if (kind === "shape") return { ...match(f), result: "invented" } as unknown as VerifyResponse;
      return kind === "step" ? match(f, "press_0") : { ...match(f), captureId: "old" };
    } });
    await engine.checkAction(frame());
    expect(engine.getSnapshot()).toMatchObject({ status: "retry", stepIndex: 0, lastResult: null });
  });
  it("recomputes missing controls rather than trusting ready=true", async () => {
    const engine = createTaskEngine({ ...createMockApiClient(), scan: async ({ frame: f }) => ({
      captureId: f.captureId, controls: [], panelReady: true, missingControls: [], message: "Panel ready",
    }) });
    engine.selectRoutine("microwave", "set_30_seconds"); await engine.scanFrame(frame()); engine.startGuidance();
    expect(engine.getSnapshot()).toMatchObject({ status: "scanning", panelReady: false });
    expect(engine.getSnapshot().missingControls).toHaveLength(3);
  });
  it("honors provider panelReady=false even when all controls exist", async () => {
    const mock = createMockApiClient();
    const engine = createTaskEngine({ ...mock, scan: async (req) => ({ ...await mock.scan(req), panelReady: false }) });
    engine.selectRoutine("microwave", "set_30_seconds"); await engine.scanFrame(frame()); engine.startGuidance();
    expect(engine.getSnapshot().status).toBe("scanning");
  });
  it.each(["duplicate", "unknown", "bounds", "identity"])("rejects invalid scan %s", async (kind) => {
    const mock = createMockApiClient();
    const engine = createTaskEngine({ ...mock, scan: async (req) => {
      const result = await mock.scan(req);
      if (kind === "duplicate") result.controls.push(result.controls[0]);
      if (kind === "unknown") result.controls[0].controlId = "invented";
      if (kind === "bounds") result.controls[0].x = 5;
      if (kind === "identity") result.captureId = "old";
      return result;
    } });
    engine.selectRoutine("microwave", "set_30_seconds"); await engine.scanFrame(frame());
    expect(engine.getSnapshot()).toMatchObject({ status: "paused", panelReady: false, busy: false });
  });
});
