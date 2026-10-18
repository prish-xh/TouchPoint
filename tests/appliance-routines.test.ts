import { describe, expect, it } from "vitest";
import { APPLIANCES } from "@/lib/catalog";
import { createMockApiClient } from "@/lib/api-client";
import { createTaskEngine } from "@/lib/task-engine";
let id = 0;
const frame = () => ({ dataUrl: "demo-only", captureId: `appliance-${++id}` });

describe("three appliance backend profiles", () => {
  it("preserves all established frontend catalog IDs and instructions", () => {
    expect(APPLIANCES.map((a) => [a.id, a.routines.map((r) => r.id)])).toEqual([
      ["microwave", ["set_30_seconds"]], ["laundry", ["normal_cold"]], ["stove", ["set_and_cancel_timer"]],
    ]);
  });
  for (const appliance of APPLIANCES) {
    for (const routine of appliance.routines) {
      it(`${appliance.id}/${routine.id}: scans and completes in mock mode`, async () => {
        const engine = createTaskEngine(createMockApiClient());
        engine.selectRoutine(appliance.id, routine.id);
        await engine.scanFrame(frame());
        expect(engine.getSnapshot().missingControls).toEqual([]);
        engine.startGuidance();
        for (let stepIndex = 0; stepIndex < routine.steps.length; stepIndex++) {
          expect(engine.getSnapshot().targetControl?.controlId).toBe(routine.steps[stepIndex].controlId);
          await engine.checkAction(frame());
          expect(engine.getSnapshot().stepIndex).toBe(stepIndex + 1);
          expect(engine.getSnapshot().lastResult?.observed).toBeTruthy();
        }
        expect(engine.getSnapshot().status).toBe("done");
        expect(appliance.simulated).toBe(appliance.id !== "laundry");
      });
      it.each(["wrong_setting", "unreadable", "api_failure", "missed_press"] as const)(`${appliance.id}: %s never advances`, async (scenario) => {
        const client = { ...createMockApiClient(), verify: createMockApiClient(scenario).verify };
        const engine = createTaskEngine(client);
        engine.selectRoutine(appliance.id, routine.id); await engine.scanFrame(frame()); engine.startGuidance();
        await engine.checkAction(frame());
        expect(engine.getSnapshot().stepIndex).toBe(0);
        expect(engine.getSnapshot().status).not.toBe("done");
      });
    }
  }
  it("stove supports only the timer and laundry does not start a wash", () => {
    expect(APPLIANCES.find((a) => a.id === "stove")!.routines.flatMap((r) => r.steps.map((s) => s.id))).toEqual(["open_timer", "add_minute", "start_timer", "cancel_timer"]);
    expect(APPLIANCES.find((a) => a.id === "laundry")!.routines[0].steps.map((s) => s.id)).toEqual(["select_normal", "select_cold"]);
  });
});
