import { z } from "zod";
import { findAppliance } from "@/lib/catalog";

const id = z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/);
export const frameSchema = z.object({
  captureId: id,
  dataUrl: z.string().max(3_000_000).regex(/^data:image\/(jpeg|png);base64,(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/),
}).strict().refine((f) => (f.dataUrl.split(",")[1]?.length ?? 0) > 0, "Image required");
export const scanRequestSchema = z.object({ applianceId: id, routineId: id, frame: frameSchema }).strict();
export const verifyRequestSchema = scanRequestSchema.extend({ stepId: id });
export function selection(applianceId: string, routineId: string) {
  const appliance = findAppliance(applianceId);
  const routine = appliance?.routines.find((r) => r.id === routineId);
  if (!appliance || !routine) throw new z.ZodError([{ code: "custom", path: [], message: "Unsupported routine" }]);
  return { appliance, routine };
}
export const preferencesSchema = z.object({
  speechRate: z.number().min(0.5).max(1.5),
  instructionDetail: z.enum(["brief", "detailed"]),
  appVoice: z.boolean(),
}).strict();
