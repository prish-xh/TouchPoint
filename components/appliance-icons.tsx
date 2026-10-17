import { IconDeviceTv, IconMicrowave, IconToolsKitchen2, IconWashMachine } from "@tabler/icons-react";

const ICONS: Record<string, typeof IconMicrowave> = {
  microwave: IconMicrowave,
  laundry: IconWashMachine,
  washer: IconWashMachine,
  stove: IconToolsKitchen2,
};

const BLURBS: Record<string, string> = {
  microwave: "Set a cook time",
  laundry: "Pick a wash cycle",
  washer: "Pick a wash cycle",
  stove: "Set a kitchen timer",
};

/** Icon for an appliance id; a generic panel icon for appliances added later. */
export function ApplianceIcon({ id, size = 32 }: { id: string; size?: number }) {
  const Icon = ICONS[id] ?? IconDeviceTv;
  return <Icon size={size} stroke={1.75} aria-hidden="true" />;
}

export function applianceBlurb(id: string, fallback: string): string {
  return BLURBS[id] ?? fallback;
}
