// TEMPORARY. Mirrors the proposed shared contract until the teammate's
// types/touchpoint.ts and hooks/useTaskController.ts land. When they do, point
// components/controller.ts at the real ones and delete this folder.
//
// Coordinates: unmirrored camera frame, normalized 0-1, origin top-left.

export type Box = { x: number; y: number; w: number; h: number };
export type Point = { x: number; y: number };

export type Control = { id: string; label: string };
export type DetectedControl = Box & { controlId: string; label: string };

export type Step = { id: string; controlId: string; instruction: string };
export type Routine = { id: string; name: string; goal: string; steps: Step[] };
export type Appliance = {
  id: string;
  name: string;
  model: string;
  simulated: boolean;
  controls: Control[];
  routines: Routine[];
};

export type VerifyResult = "matched" | "mismatched" | "uncertain";
export type VerifyResponse = {
  captureId: string;
  stepId: string;
  result: VerifyResult;
  observed: string | null;
  message: string;
};

export type Frame = { dataUrl: string; captureId: string };

export type TaskStatus =
  | "idle" // nothing selected
  | "scanning" // a scan is needed or in flight (also after the camera moved)
  | "guiding"
  | "on_target"
  | "checking"
  | "retry" // last check did not match; current step stays
  | "paused"
  | "done";

export type PauseReason = "tracking_lost" | "camera_moved" | "unexpected" | "user" | null;

export type TaskController = {
  status: TaskStatus;
  appliance: Appliance | null;
  routine: Routine | null;
  step: Step | null;
  stepIndex: number;
  targetControl: DetectedControl | null;
  controls: DetectedControl[];
  panelReady: boolean;
  missingControls: string[];
  message: string;
  lastResult: VerifyResponse | null;
  pauseReason: PauseReason;
  busy: boolean; // a scan or check request is in flight

  selectRoutine(applianceId: string, routineId: string): void;
  scanFrame(frame: Frame): Promise<void>;
  /** Added to the proposal: move from "Panel ready" to guiding when the user taps Start guidance. */
  startGuidance(): void;
  checkAction(frame: Frame): Promise<void>;
  reportTargetReached(): void;
  reportTrackingLost(): void;
  reportCameraMoved(): void;
  pause(): void;
  resume(): void;
  reset(): void;
};
