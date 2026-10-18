import type { Box } from "@/types/touchpoint";

/** Synthetic positions in an unmirrored frame; never use for real guidance. */
export const MICROWAVE_BOXES: Record<string, Box> = {
  display: { x: 0.3, y: 0.1, w: 0.4, h: 0.12 },
  add_30_seconds: { x: 0.58, y: 0.3, w: 0.12, h: 0.11 },
  digit_0: { x: 0.44, y: 0.69, w: 0.12, h: 0.11 },
  start: { x: 0.58, y: 0.69, w: 0.12, h: 0.11 },
  stop: { x: 0.3, y: 0.69, w: 0.12, h: 0.11 },
};

/** Fixture observations, not real recognition criteria or verified readings. */
export const MICROWAVE_READINGS: Record<string, { expected: string; previous: string }> = {
  press_add_30: { expected: "Cook is lit and the display shows 0:27.", previous: "The display still shows the clock." },
};
