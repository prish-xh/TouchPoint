"use client";

import type { Appliance } from "../controller";
import { ApplianceIcon } from "../appliance-icons";
import { BackButton, SimulatedTag } from "../ui";

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
    <section className="flex flex-col gap-5">
      <BackButton onClick={onBack} />
      <div className="flex items-center gap-4">
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-soft text-on-soft">
          <ApplianceIcon id={appliance.id} size={36} />
        </span>
        <div>
          <h1 tabIndex={-1} className="text-[28px] font-bold leading-tight">
            {appliance.name}
          </h1>
          <p className="text-lg text-muted">{appliance.model}</p>
        </div>
      </div>
      {appliance.simulated && (
        <p>
          <SimulatedTag />
        </p>
      )}

      <h2 className="text-xl font-bold">What would you like to do?</h2>
      <ul className="flex flex-col gap-4">
        {appliance.routines.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => onChoose(r.id)}
              className="flex min-h-24 w-full flex-col items-start gap-1 rounded-3xl bg-primary px-6 py-4 text-left text-on-primary hover:bg-primary-hover"
            >
              <span className="text-2xl font-bold">{r.name}</span>
              <span className="text-lg">
                {r.goal} {r.steps.length} steps.
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
