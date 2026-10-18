import type { Appliance } from "@/types/touchpoint";

/** GE panel reference; simulated remains true until live acceptance tests pass. */
export const MICROWAVE: Appliance = {
    id: "microwave",
    name: "Microwave",
    model: "GE JVM3160RF9SS (validation pending)",
    simulated: true,
    controls: [
      { id: "display", label: "Display" },
      { id: "add_30_seconds", label: "Add 30 Sec" },
      { id: "start", label: "Start Pause" },
      { id: "stop", label: "Cancel Off" },
    ],
    routines: [
      {
        id: "set_30_seconds",
        name: "Set 30 seconds",
        goal: "Start 30 seconds of cooking using Add 30 Sec.",
        steps: [
          { id: "press_add_30", controlId: "add_30_seconds", instruction: "With food inside and the microwave idle, press Add 30 Sec once. Cooking starts immediately. Do not press again while waiting for verification." },
        ],
      },
    ],
  };
