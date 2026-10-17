import { LAUNDRY } from "@/profiles/laundry";
import { STOVE } from "@/profiles/stove";
import { MICROWAVE } from "@/profiles/microwave";
import type { Appliance } from "@/types/touchpoint";

/** Explicitly simulated profiles until physical-device validation is complete. */
export const APPLIANCES: Appliance[] = [MICROWAVE, LAUNDRY, STOVE];
export function findAppliance(id: string): Appliance | null {
  return APPLIANCES.find((appliance) => appliance.id === id) ?? null;
}
