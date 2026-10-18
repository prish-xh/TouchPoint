import type { Box } from "@/types/touchpoint";
import { MICROWAVE_BOXES, MICROWAVE_READINGS } from "./microwave";

type Reading = { expected: string; previous: string; wrong: string };
/** All values are synthetic fixture observations, never live verification criteria. */
export const APPLIANCE_FIXTURES: Record<string, {
  boxes: Record<string, Box>; readings: Record<string, Reading>;
}> = {
  microwave: {
    boxes: MICROWAVE_BOXES,
    readings: Object.fromEntries(Object.entries(MICROWAVE_READINGS).map(([id, value]) => [id, { ...value, wrong: "The display shows 1:00." }])),
  },
  laundry: {
    boxes: {
      power: { x: 0.04, y: 0.32, w: 0.06, h: 0.06 },
      cycle_normal: { x: 0.12, y: 0.3, w: 0.22, h: 0.14 },
      temp_cold: { x: 0.66, y: 0.6, w: 0.22, h: 0.14 },
    },
    readings: {
      power_on: { expected: "The washer is powered on.", previous: "The washer is off.", wrong: "Power is not confirmed." },
      select_normal: { expected: "Normal is selected.", previous: "Heavy Duty is still selected.", wrong: "Delicates is selected." },
      select_cold: { expected: "Cold is selected.", previous: "Hot is still selected.", wrong: "Warm is selected." },
    },
  },
  stove: {
    boxes: {
      display: { x: 0.3, y: 0.12, w: 0.4, h: 0.14 },
      timer: { x: 0.1, y: 0.45, w: 0.18, h: 0.14 },
      plus_minute: { x: 0.31, y: 0.45, w: 0.18, h: 0.14 },
      start_timer: { x: 0.52, y: 0.45, w: 0.18, h: 0.14 },
      timer_off: { x: 0.73, y: 0.45, w: 0.18, h: 0.14 },
    },
    readings: {
      open_timer: { expected: "The display shows TIMER 0:00.", previous: "The display still shows the clock.", wrong: "The oven settings are displayed." },
      add_minute: { expected: "The display shows TIMER 1:00.", previous: "The display still shows TIMER 0:00.", wrong: "The display shows TIMER 2:00." },
      start_timer: { expected: "The timer shows 0:57.", previous: "The timer still shows 1:00.", wrong: "The display shows TIMER 2:00." },
      cancel_timer: { expected: "The timer is off.", previous: "The timer is still running.", wrong: "The timer is still running." },
    },
  },
};
