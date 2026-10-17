// THE ONE SWAP POINT between this UI and the teammate's controller.
//
// Today: the temporary mock in components/mock/.
// When the teammate's files land, change these lines to:
//   export { useTaskController } from "@/hooks/useTaskController";
//   export type { ... } from "@/types/touchpoint";
//   export { APPLIANCES } from "<their catalog module>";
//   export const IS_MOCK = false;
// Then delete components/mock/. No screen should import from components/mock directly.

export { useMockTaskController as useTaskController } from "./mock/useMockTaskController";
export type { MockScenario } from "./mock/useMockTaskController";
export type {
  Appliance, Box, DetectedControl, Frame, PauseReason, Point, Routine, Step, TaskController, TaskStatus, VerifyResponse,
} from "./mock/contract";
export { MOCK_APPLIANCES as APPLIANCES } from "./mock/catalog";
export const IS_MOCK = true;
