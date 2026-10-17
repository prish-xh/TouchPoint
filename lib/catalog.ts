import { MICROWAVE } from "@/profiles/microwave";
import type { Appliance } from "@/types/touchpoint";

/** Only supported foundation profiles are listed. Laundry/stove come later. */
export const APPLIANCES: Appliance[] = [MICROWAVE];
export function findAppliance(id: string): Appliance | null {
  return APPLIANCES.find((appliance) => appliance.id === id) ?? null;
}
