import type { Appliance } from "@/types/touchpoint";

/** Limited GE demo: localization checked on two photos; phone rehearsal still required. */
export const LAUNDRY: Appliance = {
    id: "laundry",
    name: "Laundry",
    model: "GE GFW550SSN5WW",
    simulated: false,
    controls: [
      { id: "cycle_normal", label: "Cycle selector dial" },
      { id: "temp_cold", label: "Temp" },
    ],
    routines: [
      {
        id: "normal_cold",
        name: "Select Normal + Cold (no wash start)",
        goal: "Select the Normal cycle with cold water.",
        steps: [
          { id: "select_normal", controlId: "cycle_normal", instruction: "With the washer powered on, turn the cycle dial until the indicator beside Normal is lit. Do not press Start." },
          { id: "select_cold", controlId: "temp_cold", instruction: "If Cold is already lit in the Temp column, leave it unchanged and check. Otherwise, press Temp once, then check the selection. Do not press Start." },
        ],
      },
    ],
  };
