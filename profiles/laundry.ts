import type { Appliance } from "@/types/touchpoint";

/** Simulation only; not validated against a physical appliance. */
export const LAUNDRY: Appliance = {
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
  };
