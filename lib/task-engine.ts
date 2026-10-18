import { APPLIANCES } from "@/lib/catalog";
import { scanResponseSchema, verifyResponseSchema } from "@/lib/api-client";
import type { Appliance, Frame, FrontendTaskController, PauseReason, PerceptionClient } from "@/types/touchpoint";

type Actions = "selectRoutine" | "scanFrame" | "startGuidance" | "checkAction" |
  "reportTargetReached" | "reportTrackingLost" | "reportCameraMoved" | "pause" | "resume" | "reset";
export type TaskSnapshot = Omit<FrontendTaskController, Actions>;
const initial = (): TaskSnapshot => ({
  status: "idle", appliance: null, routine: null, step: null, stepIndex: 0,
  targetControl: null, controls: [], panelReady: false, missingControls: [],
  message: "Choose an appliance and routine.", lastResult: null, pauseReason: null, busy: false,
});

/** One task/session per instance. No React, network globals, images stored, or implicit mock fallback. */
export function createTaskEngine(client: PerceptionClient, catalog: Appliance[] = APPLIANCES) {
  let state = initial();
  let generation = 0;
  let inFlight = false;
  let started = false;
  const usedCaptures = new Set<string>();
  const listeners = new Set<() => void>();
  function update(patch: Partial<TaskSnapshot>) {
    const next = { ...state, ...patch };
    next.step = next.routine?.steps[next.stepIndex] ?? null;
    // Frontend on-target speech uses step.instruction. Preserve the current correction
    // there too, without mutating the catalog or requiring a presentation change.
    if (next.step && next.lastResult?.stepId === next.step.id && next.lastResult.result !== "matched") {
      next.step = { ...next.step, instruction: next.lastResult.message };
    }
    next.targetControl = next.panelReady && next.step
      ? next.controls.find((c) => c.controlId === next.step!.controlId) ?? null : null;
    state = next;
    listeners.forEach((listener) => listener());
  }
  function instruction() {
    if (state.lastResult && state.lastResult.stepId === state.step?.id && state.lastResult.result !== "matched") return state.lastResult.message;
    return state.step ? `Step ${state.stepIndex + 1} of ${state.routine!.steps.length}. ${state.step.instruction}` : "Routine complete.";
  }
  function pauseWith(reason: PauseReason, message: string) {
    if (state.status === "idle" || state.status === "done") return;
    generation += 1;
    update({ status: "paused", pauseReason: reason, message });
  }
  function begin(frame: Frame) {
    if (inFlight) return null;
    if (!frame?.captureId?.trim() || !frame?.dataUrl?.trim() || usedCaptures.has(frame.captureId)) {
      update({ message: "Capture a fresh image before trying again." });
      return null;
    }
    usedCaptures.add(frame.captureId);
    inFlight = true;
    update({ busy: true });
    return generation;
  }
  function finish() {
    inFlight = false;
    update({ busy: false });
  }
  const actions: Pick<FrontendTaskController, Actions> = {
    selectRoutine(applianceId, routineId) {
      const appliance = catalog.find((a) => a.id === applianceId);
      const routine = appliance?.routines.find((r) => r.id === routineId);
      if (!appliance || !routine?.steps.length) {
        // Invalid selections must not silently leave an old task running.
        actions.reset();
        update({ message: "That routine is unavailable. Choose a supported routine." });
        return;
      }
      generation += 1;
      started = false;
      usedCaptures.clear();
      update({ ...initial(), busy: inFlight, appliance, routine, status: "scanning",
        missingControls: [...new Set(routine.steps.map((s) => s.controlId))],
        message: "Point the camera at the panel and hold it still." });
    },
    async scanFrame(frame) {
      if (state.status !== "scanning" || state.panelReady || !state.appliance || !state.routine) return;
      const appliance = state.appliance, routine = state.routine;
      const epoch = begin(frame);
      if (epoch === null) return;
      try {
        const raw = await client.scan({ applianceId: appliance.id, routineId: routine.id, frame });
        if (epoch !== generation) return;
        const result = scanResponseSchema.parse(raw);
        if (result.captureId !== frame.captureId) throw new Error("Wrong capture");
        const ids = new Set<string>();
        for (const control of result.controls) {
          if (ids.has(control.controlId) || !appliance.controls.some((c) => c.id === control.controlId)) throw new Error("Invalid controls");
          ids.add(control.controlId);
        }
        const missingControls = [...new Set([...result.missingControls,
          ...routine.steps.map((s) => s.controlId).filter((id) => !ids.has(id)),
        ])];
        const panelReady = result.panelReady && missingControls.length === 0;
        if (!result.panelReady && missingControls.length === 0) {
          // A complete map without approval is a profile gate, not a reason to keep paying for scans.
          update({ controls: result.controls, missingControls, panelReady: false });
          pauseWith("unexpected", result.message);
          return;
        }
        update({ controls: result.controls, missingControls, panelReady,
          status: panelReady && started ? "guiding" : "scanning",
          pauseReason: panelReady ? null : state.pauseReason,
          message: panelReady ? started ? `Panel found again. ${instruction()}` : "Panel ready. Tap Start guidance."
            : result.panelReady ? "Some required controls are missing. Reposition and scan again." : result.message,
        });
      } catch {
        if (epoch === generation) pauseWith("unexpected", "The panel scan failed. Resume to scan again.");
      } finally { finish(); }
    },
    startGuidance() {
      if (state.status !== "scanning" || !state.panelReady || inFlight) return;
      started = true;
      update({ status: "guiding", pauseReason: null, message: instruction() });
    },
    async checkAction(frame) {
      if (!["guiding", "on_target", "retry"].includes(state.status) || !state.panelReady || !state.step || !state.routine || !state.appliance) return;
      const { step, routine, appliance } = state;
      const epoch = begin(frame);
      if (epoch === null) return;
      update({ status: "checking", message: "Checking the panel." });
      try {
        const raw = await client.verify({ applianceId: appliance.id, routineId: routine.id, stepId: step.id, frame });
        if (epoch !== generation) return;
        const result = verifyResponseSchema.parse(raw);
        if (result.captureId !== frame.captureId || result.stepId !== step.id) throw new Error("Wrong verification identity");
        if (result.result === "matched") {
          // Advancing invalidates all work associated with the previous step.
          generation += 1;
          const next = state.stepIndex + 1;
          update({ stepIndex: next, lastResult: result, status: next === routine.steps.length ? "done" : "guiding", pauseReason: null,
            message: `${result.message} ${next === routine.steps.length ? "Routine complete." : `Step ${next + 1} of ${routine.steps.length}. ${routine.steps[next].instruction}`}`,
          });
        } else if (result.result === "mismatched") {
          update({ lastResult: result });
          pauseWith("unexpected", "The result did not match. Review the setting before resuming, or restart this routine.");
        } else {
          update({ status: "retry", lastResult: result, message: result.message });
        }
      } catch {
        if (epoch === generation) update({ status: "retry", message: "The check failed. Stay on this step and try again with a fresh image." });
      } finally { finish(); }
    },
    reportTargetReached() {
      if ((state.status === "guiding" || state.status === "retry") && state.targetControl) {
        update({ status: "on_target", message: `On target. ${instruction()}` });
      }
    },
    reportTrackingLost() {
      if (["guiding", "on_target", "retry"].includes(state.status)) pauseWith("tracking_lost", "Tracking lost. Paused until your finger returns.");
      // A hand leaving the image during verification is expected, not tracking loss.
    },
    reportCameraMoved() {
      if (state.status === "idle" || state.status === "done") return;
      generation += 1;
      const paused = state.status === "paused";
      update({ controls: [], targetControl: null, panelReady: false,
        missingControls: [...new Set(state.routine!.steps.map((s) => s.controlId))],
        status: paused ? "paused" : "scanning",
        // Preserve a manual pause; tracking recovery must not resume it.
        pauseReason: paused && state.pauseReason === "user" ? "user" : "camera_moved",
        message: paused ? "The camera moved. Resume to scan the panel again." : "The camera moved. Hold still for a new scan.",
      });
    },
    pause() { pauseWith("user", "Paused. Resume when you are ready."); },
    resume() {
      if (state.status !== "paused") return;
      const scanning = !state.panelReady || !started;
      update({ status: scanning ? "scanning" : "guiding", pauseReason: null,
        message: scanning ? state.panelReady ? "Panel ready. Tap Start guidance." : "Hold still while the panel is scanned again." : instruction() });
    },
    reset() {
      generation += 1;
      started = false;
      usedCaptures.clear();
      update({ ...initial(), busy: inFlight });
    },
  };
  return {
    ...actions,
    getSnapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    /** React cleanup invalidates outstanding replies; safe under Strict Mode's effect replay. */
    cancelPending() { if (inFlight) pauseWith("user", "Paused. Resume when you are ready."); },
  };
}
