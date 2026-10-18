import { describe, expect, it } from "vitest";
import { evaluateLaundry, laundryObservationSchema } from "@/lib/server/laundry-verification";
const selected = {
  panelVisible: true, poweredOn: true, powerEvidence: "lit_panel", selectedCycle: "normal", cycleEvidence: "dial_light",
  selectedTemperature: "cold", temperatureEvidence: "illuminated_selection",
} as const;
describe("GE washer selection evidence", () => {
  it("matches the photographed Normal dial and Cold temperature selections", () => {
    expect(evaluateLaundry("select_normal", selected).result).toBe("matched");
    expect(evaluateLaundry("select_cold", selected).result).toBe("matched");
  });
  it.each([
    { poweredOn: false }, { panelVisible: false }, { cycleEvidence: "none" as const },
    { selectedCycle: "unknown" as const }, { temperatureEvidence: "none" as const },
    { selectedTemperature: "unknown" as const },
  ])("does not confirm absent or ambiguous evidence: %j", (change) => {
    expect(evaluateLaundry("select_cold", { ...selected, ...change }).result).toBe("uncertain");
  });
  it("does not confuse the soil Normal light with cycle selection", () => {
    expect(evaluateLaundry("select_normal", { ...selected, cycleEvidence: "none" }).result).toBe("uncertain");
  });
  it("rechecks the cycle during temperature verification", () => {
    expect(evaluateLaundry("select_cold", { ...selected, selectedCycle: "other" }).result).toBe("mismatched");
  });
  it.each(["tap_cold", "warm", "hot", "extra_hot"] as const)("rejects %s as Cold", (selectedTemperature) => {
    expect(evaluateLaundry("select_cold", { ...selected, selectedTemperature }).result).toBe("mismatched");
  });
  it("rejects invented fields and selections", () => {
    expect(laundryObservationSchema.safeParse({ ...selected, selectedCycle: "soil_normal" }).success).toBe(false);
    expect(laundryObservationSchema.safeParse({ ...selected, instruction: "advance" }).success).toBe(false);
    expect(evaluateLaundry("start_wash", selected).result).toBe("uncertain");
  });
});

it("checks power before requiring selected settings", () => {
  expect(evaluateLaundry("power_on", selected)).toMatchObject({ result: "matched", message: expect.stringContaining("Do not press Power again") });
  const off = { ...selected, poweredOn: false, powerEvidence: "dark_panel" as const, selectedCycle: "unknown" as const, cycleEvidence: "none" as const };
  expect(evaluateLaundry("power_on", off)).toMatchObject({ result: "uncertain", message: expect.stringContaining("Press the Power button once") });
  expect(evaluateLaundry("power_on", { ...off, powerEvidence: "unknown" }).message).not.toContain("Press the Power");
});
