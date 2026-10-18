"use client";

// Live mode only: the private demo access code that protects our API routes.
// Stored in this browser; never part of the site's code.

import { useState } from "react";
import { useClientMode } from "../TaskClientProvider";
import { Button, Card } from "../ui";

export function DemoAccess() {
  const { hasToken, setToken, clearToken } = useClientMode();
  const [value, setValue] = useState("");

  if (hasToken) {
    return (
      <p className="flex flex-wrap items-center gap-3 text-base text-muted">
        Demo access code saved on this device.
        <button type="button" className="min-h-12 font-semibold text-primary underline" onClick={clearToken}>
          Change code
        </button>
      </p>
    );
  }

  return (
    <Card>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) setToken(value);
        }}
      >
        <label htmlFor="demo-code" className="text-xl font-semibold">
          Demo access code
        </label>
        <p className="text-lg text-muted">Live mode needs the team&apos;s private code. It stays on this device.</p>
        <input
          id="demo-code"
          type="password"
          autoComplete="off"
          className="min-h-12 rounded-xl border-2 border-outline bg-card px-3 text-lg text-ink"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <Button type="submit" disabled={!value.trim()}>
          Save code
        </Button>
      </form>
    </Card>
  );
}
