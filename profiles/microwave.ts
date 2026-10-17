import type { Appliance } from "@/types/touchpoint";

/** Simulated SIM-MW1 only. Not checked against a physical appliance. */
export const MICROWAVE: Appliance = {
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
  };
