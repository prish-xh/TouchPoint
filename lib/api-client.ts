import { z } from "zod";
import { findAppliance } from "@/lib/catalog";
import { MICROWAVE_BOXES, MICROWAVE_READINGS } from "@/fixtures/microwave";
import type { PerceptionClient, ScanRequest } from "@/types/touchpoint";

export type MockScenario = "success" | "missed_press" | "wrong_setting" | "unreadable" | "api_failure";
export class ApiClientError extends Error {
  constructor(public readonly code: "INVALID_REQUEST" | "API_FAILURE", message: string) {
    super(message);
    this.name = "ApiClientError";
  }
}

function resolveRequest(request: ScanRequest) {
  const appliance = findAppliance(request.applianceId);
  const routine = appliance?.routines.find((item) => item.id === request.routineId);
  if (!appliance || !routine || !request.frame?.captureId?.trim() || !request.frame?.dataUrl?.trim()) {
    throw new ApiClientError("INVALID_REQUEST", "A supported appliance, routine, and identified frame are required.");
  }
  return { appliance, routine };
}

/** Offline, deterministic fixture client. Never reads, stores, or sends images.
 * Scenario is fixed per client, not global or consumed by a previous request.
 * A future real adapter must implement PerceptionClient behind the same interface.
 */
export function createMockApiClient(scenario: MockScenario = "success"): PerceptionClient {
  function failIfRequested() {
    if (scenario === "api_failure") {
      throw new ApiClientError("API_FAILURE", "Simulated service failure. Retry the same step.");
    }
  }
  return {
    async scan(request) {
      const { appliance, routine } = resolveRequest(request);
      failIfRequested();
      const controls = scenario === "unreadable" ? [] : appliance.controls.map((control) => ({
        controlId: control.id, label: control.label, ...MICROWAVE_BOXES[control.id],
      }));
      const missingControls = [...new Set(routine.steps.map((step) => step.controlId))]
        .filter((id) => !controls.some((control) => control.controlId === id));
      return {
        captureId: request.frame.captureId, controls,
        panelReady: missingControls.length === 0, missingControls,
        message: missingControls.length ? "Demo: panel unreadable. Reposition and scan again." : "Demo: simulated panel ready.",
      };
    },
    async verify(request) {
      const { routine } = resolveRequest(request);
      const step = routine.steps.find((item) => item.id === request.stepId);
      if (!step) throw new ApiClientError("INVALID_REQUEST", "Step does not belong to the selected routine.");
      failIfRequested();
      const reading = MICROWAVE_READINGS[step.id];
      const result = scenario === "success" ? "matched" : scenario === "unreadable" ? "uncertain" : "mismatched";
      const observed = scenario === "unreadable" ? null
        : scenario === "success" ? reading.expected
        : scenario === "wrong_setting" ? "The display shows 1:00." : reading.previous;
      return {
        captureId: request.frame.captureId, stepId: step.id, result, observed,
        message: scenario === "success" ? `Demo: ${observed}`
          : scenario === "unreadable" ? "Demo: cannot read the display. Keep the current step and check again."
          : scenario === "wrong_setting" ? "Demo: unexpected setting. Pause and review before continuing."
          : `Demo: ${observed} The press did not register.`,
      };
    },
  };
}

/** Browser-facing transport to our routes; never receives a sponsor API key.
 * The demo access token is private to the operator, not a NEXT_PUBLIC variable.
 */
export function createHttpApiClient(token: string, fetcher: typeof fetch = fetch): PerceptionClient {
  async function post(path: string, request: unknown): Promise<unknown> {
    const response = await fetcher(path, {
      method: "POST", cache: "no-store", signal: AbortSignal.timeout(25000),
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new ApiClientError("API_FAILURE", "The request failed. Remain on the current step.");
    return response.json();
  }
  return {
    async scan(request) {
      const result = scanResponseSchema.parse(await post("/api/scan", request));
      if (result.captureId !== request.frame.captureId) throw new ApiClientError("API_FAILURE", "Stale scan response.");
      return result;
    },
    async verify(request) {
      const result = verifyResponseSchema.parse(await post("/api/verify", request));
      if (result.captureId !== request.frame.captureId || result.stepId !== request.stepId) {
        throw new ApiClientError("API_FAILURE", "Stale verification response.");
      }
      return result;
    },
  };
}

const scanResponseSchema = z.object({
  captureId: z.string(), panelReady: z.boolean(), missingControls: z.array(z.string()), message: z.string(),
  controls: z.array(z.object({
    controlId: z.string(), label: z.string(), x: z.number().min(0).max(1), y: z.number().min(0).max(1),
    w: z.number().positive().max(1), h: z.number().positive().max(1),
  }).refine((c) => c.x + c.w <= 1 && c.y + c.h <= 1)),
});
const verifyResponseSchema = z.object({
  captureId: z.string(), stepId: z.string(), result: z.enum(["matched", "mismatched", "uncertain"]),
  observed: z.string().nullable(), message: z.string(),
});
