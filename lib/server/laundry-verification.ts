import { z } from "zod";
import type { VerifyResult } from "@/types/touchpoint";

// Internal observations only; public controller and request contracts are unchanged.
export const laundryObservationSchema = z.object({
  panelVisible: z.boolean(),
  poweredOn: z.boolean(),
  powerEvidence: z.enum(["lit_panel", "dark_panel", "unknown"]),
  selectedCycle: z.enum(["normal", "other", "unknown"]),
  cycleEvidence: z.enum(["dial_light", "none"]),
  selectedTemperature: z.enum(["cold", "tap_cold", "warm", "hot", "extra_hot", "unknown"]),
  temperatureEvidence: z.enum(["illuminated_selection", "none"]),
}).strict();
export const laundryObservationJsonSchema = {
  type: "object", additionalProperties: false,
  required: ["panelVisible", "poweredOn", "powerEvidence", "selectedCycle", "cycleEvidence", "selectedTemperature", "temperatureEvidence"],
  properties: {
    panelVisible: { type: "boolean" }, poweredOn: { type: "boolean" },
    powerEvidence: { type: "string", enum: ["lit_panel", "dark_panel", "unknown"] },
    selectedCycle: { type: "string", enum: ["normal", "other", "unknown"] },
    cycleEvidence: { type: "string", enum: ["dial_light", "none"] },
    selectedTemperature: { type: "string", enum: ["cold", "tap_cold", "warm", "hot", "extra_hot", "unknown"] },
    temperatureEvidence: { type: "string", enum: ["illuminated_selection", "none"] },
  },
};
export const laundryObservationPrompt = `Inspect a GE GFW550SSN5WW washer panel. powerEvidence is lit_panel only for clearly illuminated indicators, dark_panel only if the full display is clearly visible and entirely unlit; use unknown for glare, blur, occlusion or ambiguity. Read selected states, not printed labels. The selected cycle is indicated by a lit segment around the rotary dial beside the cycle name. Normal illuminated in the Soil column is SOIL LEVEL, never evidence for the Normal CYCLE. Cold Wash beside the dial is a different cycle, not the Cold TEMPERATURE. Cold and Tap Cold are distinct temperatures. Temperature evidence must be a clearly illuminated selection in the Temp column. If the panel is dark, cropped, ambiguous, or has multiple apparent selections, use unknown/none. Do not infer operation from the time display or from printed Fill/Wash/Rinse/Spin labels.`;

/** Candidate rules: scan approval remains disabled pending live localization acceptance. */
export function evaluateLaundry(stepId: string, value: z.infer<typeof laundryObservationSchema>): { result: VerifyResult; observed: string | null; message: string } {
  const uncertain = { result: "uncertain" as const, observed: null, message: "The selected cycle or temperature is unclear. Keep the settings unchanged and capture the full illuminated panel." };
  if (stepId === "power_on") {
    if (!value.panelVisible || value.powerEvidence === "unknown") return uncertain;
    if (value.poweredOn && value.powerEvidence === "lit_panel") return { result: "matched", observed: "Washer indicators are illuminated.", message: "The washer is on. Do not press Power again." };
    if (!value.poweredOn && value.powerEvidence === "dark_panel") return { result: "uncertain", observed: "The full panel is unlit.", message: "The washer appears off. Press the Power button once, wait for it to wake, then move your hand aside and tap Check action. I will confirm it is on." };
    return uncertain;
  }
  if (!["select_normal", "select_cold"].includes(stepId) || !value.panelVisible || !value.poweredOn || value.powerEvidence !== "lit_panel" || value.cycleEvidence !== "dial_light" || value.selectedCycle === "unknown") return uncertain;
  if (value.selectedCycle !== "normal") return { result: "mismatched", observed: "A different cycle is selected.", message: stepId === "select_cold" ? "Normal is no longer selected. Restart this routine so I can guide you back to the cycle dial. Do not press Start." : "Normal is not selected. Resume, turn the dial one click clockwise, move your hand aside, and tap Check action. I will check the cycle again. Do not press Start." };
  if (stepId === "select_normal") return { result: "matched", observed: "The dial indicator selects Normal.", message: "Normal cycle is selected. This does not confirm a wash has started." };
  if (value.temperatureEvidence !== "illuminated_selection" || value.selectedTemperature === "unknown") return uncertain;
  if (value.selectedTemperature !== "cold") return { result: "mismatched", observed: `Selected temperature: ${value.selectedTemperature}.`, message: "Cold is not selected. Resume, press Temp once, move your hand aside, and tap Check action. I will check again. Do not press Start." };
  return { result: "matched", observed: "Normal cycle and Cold temperature are selected.", message: "Normal and Cold are selected. Settings are complete; the wash has not been verified as started." };
}
