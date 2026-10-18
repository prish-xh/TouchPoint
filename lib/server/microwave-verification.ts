import { z } from "zod";
import type { VerifyResponse } from "@/types/touchpoint";
export const microwaveObservationSchema = z.object({
  readable: z.boolean(), displayText: z.string().max(40).nullable(),
  mode: z.enum(["clock", "cook", "timer", "food_prompt", "unknown"]),
  cookIndicatorLit: z.boolean(),
}).strict();
export const microwaveObservationJsonSchema = {
  type: "object", additionalProperties: false,
  required: ["readable", "displayText", "mode", "cookIndicatorLit"],
  properties: { readable: { type: "boolean" }, displayText: { type: ["string", "null"] },
    mode: { type: "string", enum: ["clock", "cook", "timer", "food_prompt", "unknown"] }, cookIndicatorLit: { type: "boolean" } },
};
export const microwaveObservationPrompt = `Read the GE JVM3160RF9SS microwave display exactly. Distinguish the idle clock, cooking time with illuminated Cook indicator, kitchen timer, and Food prompt. Printed words are not illuminated indicators. Partial LED digits, glare or ambiguous modes must be unreadable/unknown. A still image cannot establish countdown motion, button press count or total programmed duration. Do not infer those.`;
export function evaluateMicrowave(o: z.infer<typeof microwaveObservationSchema>): Pick<VerifyResponse,"result"|"observed"|"message"> {
  const uncertain = { result: "uncertain" as const, observed: o.readable ? o.displayText : null,
    message: "I cannot confirm the cooking display. Do not press Add 30 Sec again. Move your hand aside and check again." };
  if (!o.readable || !o.displayText || o.mode === "unknown") return uncertain;
  if (o.mode === "food_prompt") return { result: "mismatched", observed: o.displayText,
    message: "The microwave displays Food, so cooking is not confirmed. Do not add more time. Pause this routine and check that food is loaded and the door is closed." };
  if (o.mode !== "cook" || !o.cookIndicatorLit) return uncertain;
  const text = o.displayText.trim();
  const digits = /^(\d{1,2}):([0-5]\d)$/.exec(text);
  const seconds = digits ? Number(digits[1])*60+Number(digits[2]) : /^\d{1,2}$/.test(text) ? Number(text) : null;
  if (seconds === null || seconds === 0) return uncertain;
  if (seconds > 30) return { result: "mismatched", observed: text,
    message: `The cooking display shows ${seconds} seconds, more than this routine expects. Do not press Add 30 Sec again. Pause and review the time.` };
  return { result: "matched", observed: text,
    message: `The Cook indicator is on and the display shows ${seconds} seconds remaining. This confirms the displayed setting, not that cooking has finished. Do not add more time.` };
}
