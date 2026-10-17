"use client";

import type { TaskController } from "../controller";
import { Button, Card, SimulatedTag, StatusBadge } from "../ui";

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
  const observed = lastResult?.result === "matched" ? lastResult.message : "I could not confirm the final step.";

  return (
    <section className="flex flex-col gap-6">
      <div>
        <p className="text-lg text-muted">
          {appliance?.name} · {routine?.name} {appliance?.simulated && <SimulatedTag />}
        </p>
        <h1 tabIndex={-1} className="mt-1 text-3xl font-bold">Routine complete</h1>
      </div>
      <StatusBadge status="done" />
      <Card>
        <h2 className="text-lg font-semibold text-muted">What I observed</h2>
        <p className="mt-2 text-[28px] font-bold leading-tight" role="status">
          {observed}
        </p>
        <p className="mt-3 text-lg text-muted">
          All {routine?.steps.length} steps were checked on the panel before moving on.
        </p>
      </Card>
      <div className="flex flex-col gap-3">
        <Button onClick={onAgain}>Do this routine again</Button>
        <Button variant="secondary" onClick={onHome}>
          Choose another appliance
        </Button>
      </div>
    </section>
  );
}
