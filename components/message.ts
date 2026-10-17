import type { TaskController } from "./controller";

/**
 * The sentence to show and speak for the controller's current state.
 * When a check pauses on a mismatch, lead with what the check actually saw
 * ("The display still shows 0:03. The press did not register.") so the user knows why.
 */
export function displayMessage(c: Pick<TaskController, "status" | "pauseReason" | "lastResult" | "message" | "step">): string {
  if (c.status === "paused" && c.pauseReason === "unexpected" && c.lastResult?.result === "mismatched") {
    return `${c.lastResult.message.replace(/^Demo:\s*/, "")} ${c.message}`;
  }
  // Warmer wording for being on target; the instruction itself still comes from the controller.
  if (c.status === "on_target" && c.step) return `You're right on it. ${c.step.instruction} Then tap Check.`;
  return c.message;
}
