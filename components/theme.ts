"use client";

// High-contrast toggle. The choice is saved on this device; with no saved choice,
// the phone's own "increase contrast" setting decides (see the script in app/layout.tsx).

import { useCallback, useEffect, useState } from "react";

const KEY = "touchpoint-theme";

export function useContrastTheme() {
  const [contrast, setContrast] = useState(false);

  useEffect(() => {
    setContrast(document.documentElement.dataset.theme === "contrast");
  }, []);

  const toggle = useCallback(() => {
    setContrast((on) => {
      const next = !on;
      if (next) document.documentElement.dataset.theme = "contrast";
      else delete document.documentElement.dataset.theme;
      try {
        localStorage.setItem(KEY, next ? "contrast" : "warm");
      } catch {
        // storage blocked: the choice still applies for this visit
      }
      return next;
    });
  }, []);

  return { contrast, toggle };
}
