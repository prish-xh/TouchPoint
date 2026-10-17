"use client";

// TEMPORARY stand-in for the teammate's hooks/useTaskController.ts.
// Same signature as the proposed contract; follows the plan's rules so the UI
// behaves the way it will with the real controller:
//  - only a matched check advances, exactly one step
//  - reaching the target never confirms a press
//  - uncertain / failed checks keep the current step
//  - no overlapping checks; stale responses ignored
//  - after the camera moves, a new scan is required

import { useCallback, useMemo, useRef, useState } from "react";
import type {
  Appliance, DetectedControl, Frame, PauseReason, Routine, TaskController, TaskStatus, VerifyResponse,
} from "./contract";
import { findAppliance, MOCK_BOXES, MOCK_READINGS } from "./catalog";

export type MockScenario = "success" | "missed_press" | "wrong_setting" | "unreadable" | "api_failure";

type State = {
  status: TaskStatus;
  appliance: Appliance | null;
  routine: Routine | null;
  stepIndex: number;
  controls: DetectedControl[];
  panelReady: boolean;
  missingControls: string[];
  message: string;
  lastResult: VerifyResponse | null;
  pauseReason: PauseReason;
  resumeStatus: TaskStatus | null;
  busy: boolean;
};

const EMPTY: State = {
  status: "idle",
  appliance: null,
  routine: null,
  stepIndex: 0,
  controls: [],
  panelReady: false,
  missingControls: [],
  message: "",
  lastResult: null,
  pauseReason: null,
  resumeStatus: null,
  busy: false,
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function stepIntro(routine: Routine, i: number) {
  return `Step ${i + 1} of ${routine.steps.length}. ${routine.steps[i].instruction}`;
}

export function useMockTaskController(): TaskController & {
  dev: { scenario: MockScenario; setScenario: (s: MockScenario) => void };
} {
  const [s, setS] = useState<State>(EMPTY);
  const [scenario, setScenario] = useState<MockScenario>("success");
  const stateRef = useRef(s);
  stateRef.current = s;
  const pendingRef = useRef<{ captureId: string; stepId: string; session: number } | null>(null);
  const sessionRef = useRef(0); // bumps on select/reset so late responses are dropped

  const update = useCallback((fn: (prev: State) => State) => {
    setS((prev) => {
      const next = fn(prev);
      stateRef.current = next;
      return next;
    });
  }, []);

  const selectRoutine = useCallback((applianceId: string, routineId: string) => {
    const appliance = findAppliance(applianceId);
    const routine = appliance?.routines.find((r) => r.id === routineId) ?? null;
    if (!appliance || !routine) return;
    sessionRef.current += 1;
    pendingRef.current = null;
    update(() => ({
      ...EMPTY,
      status: "scanning",
      appliance,
      routine,
      message: "Point the camera at the panel and hold the phone still.",
    }));
  }, [update]);

  const scanFrame = useCallback(async (frame: Frame) => {
    const cur = stateRef.current;
    if (!cur.appliance || !cur.routine || cur.busy) return;
    const session = sessionRef.current;
    update((p) => ({ ...p, busy: true }));
    await wait(700);
    if (session !== sessionRef.current) return;
    void frame;

    if (scenario === "api_failure") {
      update((p) => ({ ...p, busy: false, message: "I couldn't reach the scanner. Hold still and I'll try again." }));
      return;
    }
    const boxes = MOCK_BOXES[cur.appliance.id] ?? {};
    const controls: DetectedControl[] = Object.entries(boxes).map(([controlId, box]) => ({
      controlId,
      label: cur.appliance!.controls.find((c) => c.id === controlId)?.label ?? controlId,
      ...box,
    }));
    const required = [...new Set(cur.routine.steps.map((st) => st.controlId))];
    const missing = required.filter((id) => !boxes[id]);
    const ready = missing.length === 0;
    update((p) => {
      const resuming = p.pauseReason === "camera_moved" || p.stepIndex > 0 || p.lastResult !== null;
      return {
        ...p,
        busy: false,
        controls,
        panelReady: ready,
        missingControls: missing,
        // A fresh scan after the camera moved resumes guidance on the same step.
        status: ready && resuming ? "guiding" : p.status === "paused" ? "paused" : "scanning",
        pauseReason: ready && p.pauseReason === "camera_moved" ? null : p.pauseReason,
        message: ready
          ? resuming
            ? `Panel found again. ${stepIntro(p.routine!, p.stepIndex)}`
            : "Panel ready. Tap Start guidance."
          : `I can see the panel but not ${missing.length} of the controls. Move the phone back a little.`,
      };
    });
  }, [scenario, update]);

  /** UI calls this from the setup screen once the panel is ready. */
  const startGuidance = useCallback(() => {
    update((p) =>
      p.routine && p.panelReady ? { ...p, status: "guiding", message: `${stepIntro(p.routine, 0)} I'll guide your finger there.` } : p,
    );
  }, [update]);

  const reportTargetReached = useCallback(() => {
    update((p) => {
      if (p.status !== "guiding" && p.status !== "retry") return p;
      const step = p.routine!.steps[p.stepIndex];
      return { ...p, status: "on_target", message: `On target. ${step.instruction} Then tap Check action.` };
    });
  }, [update]);

  const checkAction = useCallback(async (frame: Frame) => {
    const cur = stateRef.current;
    if (!cur.routine || pendingRef.current || cur.busy) return; // no overlapping checks
    if (cur.status === "paused" || cur.status === "done" || cur.status === "scanning" || cur.status === "idle") return;
    const step = cur.routine.steps[cur.stepIndex];
    const session = sessionRef.current;
    pendingRef.current = { captureId: frame.captureId, stepId: step.id, session };
    update((p) => ({ ...p, status: "checking", busy: true, message: "Checking the panel." }));

    await wait(900);
    const pending = pendingRef.current;
    // Drop stale responses (routine reset or changed while waiting).
    if (!pending || pending.session !== sessionRef.current || pending.captureId !== frame.captureId) return;
    pendingRef.current = null;

    const reading = MOCK_READINGS[step.id];
    const used = scenario;
    setScenario("success"); // scenarios apply to one check, then the demo continues normally

    if (used === "api_failure") {
      update((p) => ({
        ...p,
        busy: false,
        status: "on_target",
        message: "I couldn't reach the checker. You're still on the same step. Tap Check action to try again.",
      }));
      return;
    }

    const result: VerifyResponse["result"] =
      used === "success" ? "matched" : used === "unreadable" ? "uncertain" : "mismatched";
    const response: VerifyResponse = {
      captureId: frame.captureId,
      stepId: step.id,
      result,
      observed: result === "uncertain" ? null : used === "success" ? reading?.expectedText ?? null : reading?.missedText ?? null,
      message:
        used === "success"
          ? reading?.expectedText ?? "Done."
          : used === "missed_press"
            ? `${reading?.missedText ?? ""} The press did not register. Let's ${step.instruction.replace(/\.$/, "").toLowerCase()} again.`
            : used === "wrong_setting"
              ? "The display shows something unexpected. Press Stop to clear it, then restart this routine."
              : "I could not read the panel clearly, so I can't confirm that step. Move your hand away and check again.",
    };

    update((p) => {
      const base = { ...p, busy: false, lastResult: response };
      if (response.result === "matched") {
        const next = p.stepIndex + 1;
        if (next >= p.routine!.steps.length) return { ...base, status: "done", message: `${response.message} Routine complete.` };
        return { ...base, stepIndex: next, status: "guiding", message: `${response.message} ${stepIntro(p.routine!, next)}` };
      }
      if (used === "wrong_setting") return { ...base, status: "paused", pauseReason: "unexpected", resumeStatus: "guiding", message: response.message };
      return { ...base, status: "retry", message: response.message };
    });
  }, [scenario, update]);

  const pauseWith = useCallback((reason: PauseReason, message: string) => {
    update((p) => {
      if (p.status === "paused" || p.status === "done" || p.status === "idle" || p.status === "scanning") return p;
      return { ...p, status: "paused", pauseReason: reason, resumeStatus: p.status === "checking" ? "on_target" : p.status, message };
    });
  }, [update]);

  const reportTrackingLost = useCallback(() => {
    const cur = stateRef.current;
    if (cur.status !== "guiding" && cur.status !== "retry") return;
    pauseWith("tracking_lost", "I can't see your finger. Paused. Bring one finger back in front of the panel.");
  }, [pauseWith]);

  const reportCameraMoved = useCallback(() => {
    const cur = stateRef.current;
    if (cur.status === "checking" || cur.status === "idle" || cur.status === "done" || cur.status === "scanning") return;
    update((p) => ({
      ...p,
      status: "scanning",
      panelReady: false,
      pauseReason: "camera_moved",
      message: "The camera moved. Hold the phone still while I find the panel again.",
    }));
  }, [update]);

  const pause = useCallback(() => pauseWith("user", "Paused. Tap Resume when you're ready."), [pauseWith]);

  const resume = useCallback(() => {
    update((p) => {
      if (p.status !== "paused") return p;
      const step = p.routine!.steps[p.stepIndex];
      return { ...p, status: p.resumeStatus ?? "guiding", pauseReason: null, resumeStatus: null, message: `Resuming. ${step.instruction}` };
    });
  }, [update]);

  const reset = useCallback(() => {
    sessionRef.current += 1;
    pendingRef.current = null;
    update(() => EMPTY);
  }, [update]);

  const step = s.routine ? s.routine.steps[s.stepIndex] ?? null : null;
  const targetControl = useMemo(
    () => (step ? s.controls.find((c) => c.controlId === step.controlId) ?? null : null),
    [step, s.controls],
  );

  return {
    status: s.status,
    appliance: s.appliance,
    routine: s.routine,
    step,
    stepIndex: s.stepIndex,
    targetControl,
    controls: s.controls,
    panelReady: s.panelReady,
    missingControls: s.missingControls,
    message: s.message,
    lastResult: s.lastResult,
    pauseReason: s.pauseReason,
    busy: s.busy,
    selectRoutine,
    scanFrame,
    checkAction,
    reportTargetReached,
    reportTrackingLost,
    reportCameraMoved,
    pause,
    resume,
    reset,
    startGuidance,
    dev: { scenario, setScenario },
  };
}
