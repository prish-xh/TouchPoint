"use client";

import type { Appliance } from "../controller";
import { ApplianceIcon, applianceBlurb } from "../appliance-icons";

export function HomeScreen({ appliances, onChoose }: { appliances: Appliance[]; onChoose: (id: string) => void }) {
  return (
    <section aria-labelledby="home-title" className="flex flex-col gap-6">
      <div>
        <h1 id="home-title" tabIndex={-1} className="text-[34px] font-bold leading-tight tracking-tight">
          Any appliance, your way
        </h1>
        <p className="mt-2 text-xl text-muted">
          I&apos;ll guide your finger to the right button, then check the panel after each press.
        </p>
      </div>

      <h2 className="text-xl font-bold">What are you using?</h2>
      <ul className="flex flex-col gap-4">
        {appliances.map((a, i) => (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => onChoose(a.id)}
              className={`flex min-h-24 w-full items-center gap-4 rounded-3xl px-5 py-4 text-left ${
                i === 0
                  ? "bg-primary text-on-primary hover:bg-primary-hover"
                  : "border-2 border-line bg-soft text-on-soft hover:border-outline"
              }`}
              aria-label={`${a.name}. ${applianceBlurb(a.id, a.routines[0]?.goal ?? "")}. Supported model: ${a.model}.${
                a.simulated ? " Simulated panel." : ""
              }`}
            >
              <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${i === 0 ? "bg-on-primary/15" : "bg-card"}`}>
                <ApplianceIcon id={a.id} />
              </span>
              <span className="flex flex-col">
                <span className="text-2xl font-bold">{a.name}</span>
                <span className="text-lg">{applianceBlurb(a.id, a.routines[0]?.goal ?? "")}</span>
                {a.simulated && <span className="text-base opacity-90">Simulated panel</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="text-base text-muted">More appliances are on the way.</p>
    </section>
  );
}
