// THE ONE SWAP POINT between the UI and the controller.
// Now wired to the real controller (hooks/useTaskController.ts) and shared types.
// Which perception client it talks to (offline demo vs live API) is chosen in
// components/TaskClientProvider.tsx.

export { useTaskController, TaskClientContext } from "@/hooks/useTaskController";
export type {
  Appliance, Box, DetectedControl, Frame, PauseReason, Point, Routine, Step, TaskStatus, VerifyResponse,
} from "@/types/touchpoint";
// The UI needs the frontend extension (startGuidance, busy, pauseReason, missingControls).
export type { FrontendTaskController as TaskController } from "@/types/touchpoint";
export type { MockScenario } from "@/lib/api-client";
export { APPLIANCES } from "@/lib/catalog";
