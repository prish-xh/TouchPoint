"use client";

import type { TaskController } from "../controller";
import { Button, Card, SimulatedTag } from "../ui";

function Celebration() {
  return (
    <svg width="112" height="112" viewBox="0 0 74 74" className="tp-pop mx-auto" aria-hidden="true">
      <circle cx="37" cy="37" r="34" fill="var(--soft)" />
      <circle cx="37" cy="37" r="24" fill="var(--primary)" />
      <path d="M26 37l8 8 14-16" fill="none" stroke="var(--on-primary)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="8" cy="18" r="3" fill="var(--primary)" />
      <circle cx="67" cy="14" r="2.5" fill="var(--primary)" />
      <circle cx="64" cy="61" r="3" fill="var(--primary)" />
      <circle cx="10" cy="58" r="2" fill="var(--primary)" />
    </svg>
  );
}

export function ResultScreen({
  controller,
  onAgain,
  onHome,
}: {
  controller: TaskController;
  onAgain: () => void;
  onHome: () => void;
}) {
  const { appliance, routine, lastResult } = controller;
  // Only reached on a verified match, but still state exactly what was observed.
  const matched = lastResult?.result === "matched";
  const observed = matched ? lastResult.message.replace(/^Demo:\s*/, "") : "I could not confirm the final step.";

  return (
    <section className="flex flex-col gap-6 text-center">
      <div className="pt-4">
        <Celebration />
        <h1 tabIndex={-1} className="mt-4 text-[34px] font-bold leading-tight">
          You&apos;re all set
        </h1>
        <p className="mt-1 text-lg text-muted">
          {appliance?.name} · {routine?.name}
        </p>
        {appliance?.simulated && (
          <p className="mt-2">
            <SimulatedTag />
          </p>
        )}
      </div>
      <Card className="text-left">
        <h2 className="text-lg font-bold text-muted">What I saw</h2>
        <p className="mt-1 text-[28px] font-bold leading-tight" role="status">
          {observed}
        </p>
        <p className="mt-3 text-lg text-muted">
          All {routine?.steps.length} steps were checked on the panel before moving on.
        </p>
      </Card>
      <div className="flex flex-col gap-3">
        <Button onClick={onAgain}>Do it again</Button>
        <Button variant="secondary" onClick={onHome}>
          Another appliance
        </Button>
      </div>
    </section>
  );
}
