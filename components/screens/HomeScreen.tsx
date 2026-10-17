"use client";

import type { Appliance } from "../controller";
import { SimulatedTag } from "../ui";

export function HomeScreen({ appliances, onChoose }: { appliances: Appliance[]; onChoose: (id: string) => void }) {
  return (
    <section aria-labelledby="home-title" className="flex flex-col gap-6">
      <div>
        <h1 id="home-title" tabIndex={-1} className="text-4xl font-bold tracking-tight">
          Touchpoint
        </h1>
        <p className="mt-2 text-xl text-muted">
          Guides your finger to the right button on shared appliances, and checks the panel after each press.
        </p>
      </div>

      <h2 className="text-2xl font-bold">Choose an appliance</h2>
      <ul className="flex flex-col gap-4">
        {appliances.map((a) => (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => onChoose(a.id)}
              className="flex min-h-24 w-full flex-col items-start gap-1 rounded-2xl bg-primary px-6 py-4 text-left text-white hover:bg-primary-dark"
              aria-label={`${a.name}. Supported model: ${a.model}.${a.simulated ? " Simulated panel." : ""}`}
            >
              <span className="text-2xl font-bold">{a.name}</span>
              <span className="text-lg text-blue-100">Supported model: {a.model}</span>
            </button>
            {a.simulated && (
              <p className="mt-2 pl-1" aria-hidden="true">
                <SimulatedTag />
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
