"use client";

import { IconContrast } from "@tabler/icons-react";
import { Logo } from "./Logo";
import { useContrastTheme } from "./theme";

export function AppHeader({ onHome }: { onHome?: () => void }) {
  const { contrast, toggle } = useContrastTheme();
  return (
    <header className="flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={onHome}
        className="flex min-h-12 min-w-0 items-center gap-2 rounded-2xl pr-2"
        aria-label="Touchpoint home"
      >
        <Logo size={40} />
        <span className="text-xl font-bold">Touchpoint</span>
      </button>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={contrast}
        aria-label="High contrast"
        className={`inline-flex min-h-12 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border-2 px-3 text-base font-bold ${
          contrast ? "border-primary bg-primary text-on-primary" : "border-line bg-card text-ink"
        }`}
      >
        <IconContrast size={20} aria-hidden="true" />
        {contrast ? "Contrast on" : "Contrast"}
      </button>
    </header>
  );
}
