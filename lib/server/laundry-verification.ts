import { z } from "zod";
import type { VerifyResult } from "@/types/touchpoint";

// Internal observations only; public controller and request contracts are unchanged.
export const laundryObservationSchema = z.object({
  panelVisible: z.boolean(),
  poweredOn: z.boolean(),
  selectedCycle: z.enum(["normal", "other", "unknown"]),
  cycleEvidence: z.enum(["dial_light", "none"]),
  selectedTemperature: z.enum(["cold", "tap_cold", "warm", "hot", "extra_hot", "unknown"]),
  temperatureEvidence: z.enum(["illuminated_selection", "none"]),
}).strict();
export const laundryObservationJsonSchema = {
  type: "object", additionalProperties: false,
  required: ["panelVisible", "poweredOn", "selectedCycle", "cycleEvidence", "selectedTemperature", "temperatureEvidence"],
  properties: {
    panelVisible: { type: "boolean" }, poweredOn: { type: "boolean" },
    selectedCycle: { type: "string", enum: ["normal", "other", "unknown"] },
    cycleEvidence: { type: "string", enum: ["dial_light", "none"] },
    selectedTemperature: { type: "string", enum: ["cold", "tap_cold", "warm", "hot", "extra_hot", "unknown"] },
    temperatureEvidence: { type: "string", enum: ["illuminated_selection", "none"] },
  },
};
export const laundryObservationPrompt = `Inspect a GE GFW550SSN5WW washer panel. Read selected states, not printed labels. The selected cycle is indicated by a lit segment around the rotary dial beside the cycle name. Normal illuminated in the Soil column is SOIL LEVEL, never evidence for the Normal CYCLE. Cold Wash beside the dial is a different cycle, not the Cold TEMPERATURE. Cold and Tap Cold are distinct temperatures. Temperature evidence must be a clearly illuminated selection in the Temp column. If the panel is dark, cropped, ambiguous, or has multiple apparent selections, use unknown/none. Do not infer operation from the time display or from printed Fill/Wash/Rinse/Spin labels.`;

/** Candidate rules: scan approval remains disabled pending live localization acceptance. */
export function evaluateLaundry(stepId: string, value: z.infer<typeof laundryObservationSchema>): { result: VerifyResult; observed: string | null; message: string } {
  const uncertain = { result: "uncertain" as const, observed: null, message: "The selected cycle or temperature is unclear. Keep the settings unchanged and capture the full illuminated panel." };
  if (!["select_normal", "select_cold"].includes(stepId) || !value.panelVisible || !value.poweredOn || value.cycleEvidence !== "dial_light" || value.selectedCycle === "unknown") return uncertain;
  if (value.selectedCycle !== "normal") return { result: "mismatched", observed: "A different cycle is selected.", message: "The dial indicator is not at Normal. Pause and review the cycle selection." };
  if (stepId === "select_normal") return { result: "matched", observed: "The dial indicator selects Normal.", message: "Normal cycle is selected. This does not confirm a wash has started." };
  if (value.temperatureEvidence !== "illuminated_selection" || value.selectedTemperature === "unknown") return uncertain;
  if (value.selectedTemperature !== "cold") return { result: "mismatched", observed: `Selected temperature: ${value.selectedTemperature}.`, message: "Cold temperature is not selected. Pause and review the Temp setting; do not start the wash." };
  return { result: "matched", observed: "Normal cycle and Cold temperature are selected.", message: "Normal and Cold are selected. Settings are complete; the wash has not been verified as started." };
}
