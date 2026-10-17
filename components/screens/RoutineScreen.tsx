"use client";

import type { Appliance } from "../controller";
import { ScreenTitle, SimulatedTag } from "../ui";

export function RoutineScreen({
  appliance,
  onChoose,
  onBack,
}: {
  appliance: Appliance;
  onChoose: (routineId: string) => void;
  onBack: () => void;
}) {
  return (
    <section className="flex flex-col gap-6">
      <ScreenTitle onBack={onBack}>{appliance.name}</ScreenTitle>
      <p className="text-lg text-muted">
        Supported model: {appliance.model} {appliance.simulated && <SimulatedTag />}
      </p>

      <h2 className="text-2xl font-bold">What do you want to do?</h2>
      <ul className="flex flex-col gap-4">
        {appliance.routines.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => onChoose(r.id)}
              className="flex min-h-24 w-full flex-col items-start gap-1 rounded-2xl bg-primary px-6 py-4 text-left text-white hover:bg-primary-dark"
            >
              <span className="text-2xl font-bold">{r.name}</span>
              <span className="text-lg text-blue-100">
                {r.goal} {r.steps.length} steps.
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
