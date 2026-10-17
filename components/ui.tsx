"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { TaskStatus } from "./controller";

type Variant = "primary" | "secondary" | "quiet";

const VARIANT: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-dark disabled:bg-slate-400",
  secondary: "bg-white text-ink border-2 border-ink/80 hover:bg-slate-50 disabled:text-slate-400 disabled:border-slate-300",
  quiet: "bg-transparent text-primary underline underline-offset-4 hover:text-primary-dark",
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
      className={`w-full rounded-2xl font-semibold transition-colors ${sizing} ${VARIANT[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-white p-5 shadow-sm ${className}`}>{children}</div>;
}

const STATUS_TEXT: Record<TaskStatus, { label: string; tone: string; mark: string }> = {
  idle: { label: "Not started", tone: "bg-slate-100 text-ink", mark: "•" },
  scanning: { label: "Finding panel", tone: "bg-slate-100 text-ink", mark: "…" },
  guiding: { label: "Guiding", tone: "bg-blue-50 text-primary-dark", mark: "→" },
  on_target: { label: "Guiding: on target", tone: "bg-blue-50 text-primary-dark", mark: "●" },
  checking: { label: "Checking", tone: "bg-amber-50 text-warn", mark: "…" },
  retry: { label: "Retry", tone: "bg-amber-50 text-warn", mark: "↻" },
  paused: { label: "Paused", tone: "bg-red-50 text-bad", mark: "II" },
  done: { label: "Done", tone: "bg-green-50 text-good", mark: "✓" },
};

/** Status is always spelled out; color is only a second cue. */
export function StatusBadge({ status }: { status: TaskStatus }) {
  const s = STATUS_TEXT[status];
  return (
    <p className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-lg font-semibold ${s.tone}`}>
      <span aria-hidden="true">{s.mark}</span>
      <span>Status: {s.label}</span>
    </p>
  );
}

export function ScreenTitle({ children, onBack }: { children: ReactNode; onBack?: () => void }) {
  return (
    <div className="flex flex-col items-start gap-1">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="-ml-3 min-h-12 min-w-12 rounded-xl px-3 text-lg font-semibold text-primary hover:bg-blue-50"
        >
          <span aria-hidden="true">←</span> Back
        </button>
      )}
      <h1 tabIndex={-1} className="text-2xl font-bold">{children}</h1>
    </div>
  );
}

export function SimulatedTag() {
  return (
    <span className="inline-block rounded-md border border-warn bg-amber-50 px-2 py-0.5 text-base font-semibold text-warn">
      Simulated panel
    </span>
  );
}
