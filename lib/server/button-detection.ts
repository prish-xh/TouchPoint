import sharp from "sharp";
import { z } from "zod";
import type { Control, DetectedControl } from "@/types/touchpoint";
import { parseProvider, ServiceError } from "./http";

/** Normalize EXIF orientation, strip metadata, bound decoded size and preserve aspect ratio.
 * Only in-memory processing; returned boxes map to the same upright full-frame view.
 */
export async function preparePanelImage(dataUrl: string) {
  try {
    const bytes = Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64");
    const { data, info } = await sharp(bytes, { limitInputPixels: 30_000_000 })
      .rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 90 }).toBuffer({ resolveWithObject: true });
    return { dataUrl: `data:image/jpeg;base64,${data.toString("base64")}`, width: info.width, height: info.height };
  } catch {
    throw new ServiceError("INVALID_IMAGE", 400, "The image could not be decoded. Capture a new JPEG or PNG frame.");
  }
}
const point = z.object({ x: z.number().finite().nonnegative(), y: z.number().finite().nonnegative() });
const detectionResponse = z.object({
  finish_reason: z.literal("complete"),
  detections: z.array(z.object({ mention: z.string(), point_box: z.object({ top_left: point, bottom_right: point }) })).max(100),
});
export function detectionCategory(control: Control) {
  return control.id === "display" ? "appliance digital display" : `button labeled ${control.label}`;
}

/** Native /detect boxes are pixels, not the chat annotation system's 0–1000 grid. */
export function normalizeDetections(raw: unknown, controls: Control[], width: number, height: number): DetectedControl[] {
  if (!(width > 0 && height > 0 && Number.isFinite(width) && Number.isFinite(height))) throw new Error("Invalid image size");
  const result = parseProvider(detectionResponse, raw);
  const categories = new Map(controls.map((c) => [detectionCategory(c), c]));
  const counts = new Map<string, number>();
  result.detections.forEach((d) => counts.set(d.mention, (counts.get(d.mention) ?? 0) + 1));
  const candidates: DetectedControl[] = [];
  for (const detection of result.detections) {
    const control = categories.get(detection.mention);
    if (!control || counts.get(detection.mention) !== 1) continue;
    const { top_left: a, bottom_right: b } = detection.point_box;
    if (b.x <= a.x || b.y <= a.y || b.x > width || b.y > height) continue;
    candidates.push({ controlId: control.id, label: control.label,
      x: a.x / width, y: a.y / height, w: (b.x - a.x) / width, h: (b.y - a.y) / height });
  }
  // Two labels pointing to substantially the same area are ambiguous; omit both.
  return candidates.filter((a) => !candidates.some((b) => {
    if (a === b) return false;
    const overlap = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) *
      Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
    return overlap / Math.min(a.w * a.h, b.w * b.h) > 0.7;
  }));
}
