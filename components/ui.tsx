"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { IconArrowLeft } from "@tabler/icons-react";
import type { TaskStatus } from "./controller";

type Variant = "primary" | "secondary" | "quiet";

const VARIANT: Record<Variant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-hover disabled:opacity-50",
  secondary: "bg-card text-ink border-2 border-outline hover:bg-soft disabled:opacity-50",
  quiet: "bg-transparent text-link underline underline-offset-4",
};

export function Button({
  variant = "primary",
  size = "lg",
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "lg" | "md" }) {
  const sizing = size === "lg" ? "min-h-16 px-6 text-xl" : "min-h-12 px-4 text-lg";
  return (
    <button
      type="button"
      className={`w-full rounded-2xl font-bold transition-colors ${sizing} ${VARIANT[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-line bg-card p-5 ${className}`}>{children}</div>;
}

const STATUS_TEXT: Record<TaskStatus, { label: string; tone: string; mark: string }> = {
  idle: { label: "Not started", tone: "bg-soft text-on-soft", mark: "•" },
  scanning: { label: "Finding the panel", tone: "bg-soft text-on-soft", mark: "…" },
  guiding: { label: "Guiding", tone: "bg-soft text-on-soft", mark: "→" },
  on_target: { label: "On target", tone: "bg-soft text-on-soft", mark: "●" },
  checking: { label: "Checking", tone: "bg-warn-bg text-warn", mark: "…" },
  retry: { label: "Try again", tone: "bg-warn-bg text-warn", mark: "↻" },
  paused: { label: "Paused", tone: "bg-bad-bg text-bad", mark: "II" },
  done: { label: "Done", tone: "bg-good-bg text-good", mark: "✓" },
};

/** Status is always spelled out; color is only a second cue. */
export function StatusBadge({ status }: { status: TaskStatus }) {
  const s = STATUS_TEXT[status];
  return (
    <p className={`inline-flex items-center gap-2 self-start rounded-full px-4 py-2 text-lg font-bold ${s.tone}`}>
      <span aria-hidden="true">{s.mark}</span>
      <span>
        <span className="sr-only">Status: </span>
        {s.label}
      </span>
    </p>
  );
}

/** Step progress as a bar of segments, with the same information as text. */
export function StepProgress({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1.5" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`h-2 w-8 rounded-full ${i < current ? "bg-primary" : "bg-track"}`} />
        ))}
      </div>
      <span className="text-lg font-bold text-muted">
        Step {current} of {total}
      </span>
    </div>
  );
}

export function BackButton({ onClick, label = "Back" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-ml-2 inline-flex min-h-12 items-center gap-1 self-start rounded-xl px-2 text-lg font-bold text-link hover:bg-soft"
    >
      <IconArrowLeft size={22} aria-hidden="true" />
      {label}
    </button>
  );
}

export function ScreenTitle({ children, onBack }: { children: ReactNode; onBack?: () => void }) {
  return (
    <div className="flex flex-col items-start gap-1">
      {onBack && <BackButton onClick={onBack} />}
      <h1 tabIndex={-1} className="text-[28px] font-bold leading-tight">
        {children}
      </h1>
    </div>
  );
}

export function SimulatedTag() {
  return (
    <span className="inline-block rounded-lg border border-warn bg-warn-bg px-2 py-0.5 text-base font-bold text-warn">
      Simulated panel
    </span>
  );
}
