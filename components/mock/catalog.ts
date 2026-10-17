// TEMPORARY mock catalog. The real catalog comes from the teammate's profiles.

import type { Appliance, Box } from "./contract";

type MockStep = { expectedText: string; missedText: string };

export const MOCK_APPLIANCES: Appliance[] = [
  {
    id: "microwave",
    name: "Microwave",
    model: "Simulated keypad microwave (SIM-MW1)",
    simulated: true,
    controls: [
      { id: "display", label: "Display" },
      { id: "digit_3", label: "3" },
      { id: "digit_0", label: "0" },
      { id: "start", label: "Start" },
      { id: "stop", label: "Stop" },
    ],
    routines: [
      {
        id: "set_30_seconds",
        name: "Set 30 seconds",
        goal: "Enter a 30-second cooking time and start it.",
        steps: [
          { id: "press_3", controlId: "digit_3", instruction: "Press 3." },
          { id: "press_0", controlId: "digit_0", instruction: "Press 0." },
          { id: "press_start", controlId: "start", instruction: "Press Start." },
        ],
      },
    ],
  },
  {
    id: "laundry",
    name: "Laundry",
    model: "Simulated washer (SIM-WA1)",
    simulated: true,
    controls: [
      { id: "cycle_normal", label: "Normal" },
      { id: "temp_cold", label: "Cold" },
    ],
    routines: [
      {
        id: "normal_cold",
        name: "Normal wash, cold water",
        goal: "Select the Normal cycle with cold water.",
        steps: [
          { id: "select_normal", controlId: "cycle_normal", instruction: "Press Normal." },
          { id: "select_cold", controlId: "temp_cold", instruction: "Press Cold." },
        ],
      },
    ],
  },
  {
    id: "stove",
    name: "Stove",
    model: "Simulated range panel (SIM-ST1), timer only",
    simulated: true,
    controls: [
      { id: "display", label: "Display" },
      { id: "timer", label: "Timer" },
      { id: "plus_minute", label: "+1 Min" },
      { id: "start_timer", label: "Start Timer" },
      { id: "timer_off", label: "Timer Off" },
    ],
    routines: [
      {
        id: "set_and_cancel_timer",
        name: "Set kitchen timer",
        goal: "Set a 1-minute kitchen timer, start it, then cancel it.",
        steps: [
          { id: "open_timer", controlId: "timer", instruction: "Press Timer." },
          { id: "add_minute", controlId: "plus_minute", instruction: "Press plus 1 minute." },
          { id: "start_timer", controlId: "start_timer", instruction: "Press Start Timer." },
          { id: "cancel_timer", controlId: "timer_off", instruction: "Press Timer Off." },
        ],
      },
    ],
  },
];

/** Where the mock scan "finds" each control. */
export const MOCK_BOXES: Record<string, Record<string, Box>> = {
  microwave: {
    display: { x: 0.3, y: 0.1, w: 0.4, h: 0.12 },
    digit_3: { x: 0.58, y: 0.3, w: 0.12, h: 0.11 },
    digit_0: { x: 0.44, y: 0.69, w: 0.12, h: 0.11 },
    start: { x: 0.58, y: 0.69, w: 0.12, h: 0.11 },
    stop: { x: 0.3, y: 0.69, w: 0.12, h: 0.11 },
  },
  laundry: {
    cycle_normal: { x: 0.12, y: 0.3, w: 0.22, h: 0.14 },
    temp_cold: { x: 0.66, y: 0.6, w: 0.22, h: 0.14 },
  },
  stove: {
    display: { x: 0.3, y: 0.12, w: 0.4, h: 0.14 },
    timer: { x: 0.1, y: 0.45, w: 0.18, h: 0.14 },
    plus_minute: { x: 0.31, y: 0.45, w: 0.18, h: 0.14 },
    start_timer: { x: 0.52, y: 0.45, w: 0.18, h: 0.14 },
    timer_off: { x: 0.73, y: 0.45, w: 0.18, h: 0.14 },
  },
};

/** What the mock "reads" after each step. */
export const MOCK_READINGS: Record<string, MockStep> = {
  press_3: { expectedText: "The display shows 0:03.", missedText: "The display still shows 0:00." },
  press_0: { expectedText: "The display shows 0:30.", missedText: "The display still shows 0:03." },
  press_start: { expectedText: "The display shows 0:27.", missedText: "The display still shows 0:30." },
  select_normal: { expectedText: "Normal is selected.", missedText: "Heavy Duty is still selected." },
  select_cold: { expectedText: "Cold is selected.", missedText: "Hot is still selected." },
  open_timer: { expectedText: "The display shows TIMER 0:00.", missedText: "The display still shows the clock." },
  add_minute: { expectedText: "The display shows TIMER 1:00.", missedText: "The display still shows TIMER 0:00." },
  start_timer: { expectedText: "The timer shows 0:57.", missedText: "The timer still shows 1:00." },
  cancel_timer: { expectedText: "The timer is off.", missedText: "The timer is still running." },
};

export function findAppliance(id: string) {
  return MOCK_APPLIANCES.find((a) => a.id === id) ?? null;
}
