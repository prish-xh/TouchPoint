"use client";

// Demo-mode testing aid (offline mock client only). Hidden in live mode (?live).

import type { MockScenario } from "../controller";

const OPTIONS: { value: MockScenario; label: string }[] = [
  { value: "success", label: "Success" },
  { value: "missed_press", label: "Missed press (display unchanged)" },
  { value: "wrong_setting", label: "Wrong setting" },
  { value: "unreadable", label: "Unreadable display" },
  { value: "api_failure", label: "API failure" },
];

export function DevPanel({
  scenario,
  setScenario,
  onFakeOnTarget,
}: {
  scenario: MockScenario;
  setScenario: (s: MockScenario) => void;
  onFakeOnTarget: () => void;
}) {
  return (
    <details className="rounded-2xl border-2 border-dashed border-warn bg-amber-50 p-4">
      <summary className="min-h-12 cursor-pointer text-lg font-semibold text-warn">Mock test controls</summary>
      <div className="mt-3 flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-lg">
          Result of the next check
          <select
            className="min-h-12 rounded-xl border-2 border-ink/60 bg-white px-3 text-lg"
            value={scenario}
            onChange={(e) => setScenario(e.target.value as MockScenario)}
          >
            {OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={onFakeOnTarget}
          className="min-h-12 rounded-xl border-2 border-ink/60 bg-white px-4 text-lg font-semibold"
        >
          Pretend my finger is on target
        </button>
        <p className="text-base text-muted">Scenarios apply to one check, then reset to Success.</p>
      </div>
    </details>
  );
}
