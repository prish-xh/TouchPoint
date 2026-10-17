// Pure helpers for the camera overlay and finger guidance. No React, no DOM.
// Inputs use the unmirrored camera frame, normalized 0-1, origin top-left.

import type { Box, Point } from "./controller";

export function center(b: Box): Point {
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
}

export function contains(b: Box, p: Point, pad = 0): boolean {
  return p.x >= b.x - pad && p.x <= b.x + b.w + pad && p.y >= b.y - pad && p.y <= b.y + b.h + pad;
}

/**
 * Where a videoW x videoH frame is drawn inside a boxW x boxH element with
 * object-fit: contain (letterboxed, never cropped).
 */
export function containLayout(videoW: number, videoH: number, boxW: number, boxH: number) {
  const scale = Math.min(boxW / videoW, boxH / videoH);
  const drawW = videoW * scale;
  const drawH = videoH * scale;
  const offX = (boxW - drawW) / 2;
  const offY = (boxH - drawH) / 2;
  return {
    drawW,
    drawH,
    offX,
    offY,
    point: (p: Point) => ({ x: offX + p.x * drawW, y: offY + p.y * drawH }),
    box: (b: Box) => ({ x: offX + b.x * drawW, y: offY + b.y * drawH, w: b.w * drawW, h: b.h * drawH }),
  };
}

export const TARGET_PAD = 0.012; // forgiveness around the target box
const NEAR = 0.06; // main-axis distance below which we say "a little"

export type Direction = "left" | "right" | "up" | "down";
export type Guidance =
  | { onTarget: true; direction: null; small: false }
  | { onTarget: false; direction: Direction; small: boolean };

/** One axis at a time: whichever is further off. */
export function guide(tip: Point, target: Box): Guidance {
  if (contains(target, tip, TARGET_PAD)) return { onTarget: true, direction: null, small: false };
  const c = center(target);
  const dx = c.x - tip.x;
  const dy = c.y - tip.y;
  const horizontal = Math.abs(dx) >= Math.abs(dy);
  const direction: Direction = horizontal ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
  const small = (horizontal ? Math.abs(dx) : Math.abs(dy)) < NEAR;
  return { onTarget: false, direction, small };
}

export function directionSentence(g: Guidance, label: string): string {
  if (g.onTarget) return `On target. Press ${label}.`;
  return `Move ${g.small ? "a little " : ""}${g.direction} toward ${label}.`;
}

/** Spoken name for a control: digits read better as "button 3" than "3". */
export function spokenLabel(label: string): string {
  return /^\d$/.test(label) ? `button ${label}` : label;
}

export function frameDifference(a: Uint8Array | null, b: Uint8Array | null): number {
  if (!a || !b || a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
  return sum / a.length;
}

export function toGray(rgba: Uint8ClampedArray): Uint8Array {
  const out = new Uint8Array(rgba.length / 4);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j++) {
    out[j] = (rgba[i] * 77 + rgba[i + 1] * 150 + rgba[i + 2] * 29) >> 8;
  }
  return out;
}
