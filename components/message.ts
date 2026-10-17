import type { TaskController } from "./controller";

/**
 * The sentence to show and speak for the controller's current state.
 * When a check pauses on a mismatch, lead with what the check actually saw
 * ("The display still shows 0:03. The press did not register.") so the user knows why.
 */
export function displayMessage(c: Pick<TaskController, "status" | "pauseReason" | "lastResult" | "message">): string {
  if (c.status === "paused" && c.pauseReason === "unexpected" && c.lastResult?.result === "mismatched") {
    return `${c.lastResult.message.replace(/^Demo:\s*/, "")} ${c.message}`;
  }
  return c.message;
}
