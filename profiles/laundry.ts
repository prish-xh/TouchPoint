import type { Appliance } from "@/types/touchpoint";

/** Limited GE demo: localization checked on two photos; phone rehearsal still required. */
export const LAUNDRY: Appliance = {
    id: "laundry",
    name: "Laundry",
    model: "GE GFW550SSN5WW",
    simulated: false,
    controls: [
      { id: "power", label: "Power" },
      { id: "cycle_normal", label: "Cycle selector dial" },
      { id: "temp_cold", label: "Temp" },
    ],
    routines: [
      {
        id: "normal_cold",
        name: "Select Normal + Cold (no wash start)",
        goal: "Select the Normal cycle with cold water.",
        steps: [
          { id: "power_on", controlId: "power", instruction: "Tap Check action first. I will check whether the washer is on before asking you to press Power." },
          { id: "select_normal", controlId: "cycle_normal", instruction: "Leave the dial unchanged and tap Check action. I will tell you whether Normal is selected. Do not press Start." },
          { id: "select_cold", controlId: "temp_cold", instruction: "Leave Temp unchanged and tap Check action. I will tell you whether Cold is selected. Do not press Start." },
        ],
      },
    ],
  };
