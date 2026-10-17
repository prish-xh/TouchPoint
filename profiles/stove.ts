import type { Appliance } from "@/types/touchpoint";

/** Simulation only; not validated against a physical appliance. */
export const STOVE: Appliance = {
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
  };
