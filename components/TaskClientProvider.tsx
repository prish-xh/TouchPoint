"use client";

// Chooses which PerceptionClient the real controller uses and provides it via
// TaskClientContext (the teammate's hook reads it). Owned by the frontend.
//
// Modes (from the page URL):
//   default      Demo mode: the teammate's offline mock client, with the test controls.
//   ?live        Live mode: our /api routes via createHttpApiClient(token).
//                The private demo access code is entered on the Home screen (or passed once
//                as ?token=...), kept in this browser only, never bundled into the site.
//
// The client object is created once (stable identity), because a new client identity
// makes the controller start a fresh task engine.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { TaskClientContext, type MockScenario } from "./controller";
import { createHttpApiClient, createMockApiClient } from "@/lib/api-client";
import type { PerceptionClient } from "@/types/touchpoint";

const TOKEN_KEY = "touchpoint-demo-token";

type ClientMode = {
  live: boolean;
  /** Live mode only: whether a demo access code is set. */
  hasToken: boolean;
  setToken: (token: string) => void;
  clearToken: () => void;
  /** Demo mode only: outcome of the next check (applies once, then back to success). */
  scenario: MockScenario;
  setScenario: (s: MockScenario) => void;
};

const ClientModeContext = createContext<ClientMode | null>(null);

export function useClientMode(): ClientMode {
  const mode = useContext(ClientModeContext);
  if (!mode) throw new Error("useClientMode must be used inside TaskClientProvider");
  return mode;
}

function readStoredToken(): string {
  try {
    return window.localStorage.getItem(TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}

export function TaskClientProvider({ children }: { children: ReactNode }) {
  const [live, setLive] = useState(false);
  const [token, setTokenState] = useState("");
  const [scenario, setScenarioState] = useState<MockScenario>("success");
  const scenarioRef = useRef<MockScenario>("success");
  const tokenRef = useRef("");

  // Read the mode once on the client (URL is not available during prerender).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");
    if (urlToken) {
      try {
        window.localStorage.setItem(TOKEN_KEY, urlToken);
      } catch {
        // storage blocked: the code still works for this visit
      }
      // Remove the code from the address bar so it isn't shared by accident.
      params.delete("token");
      const query = params.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
    }
    const stored = urlToken ?? readStoredToken();
    tokenRef.current = stored;
    setTokenState(stored);
    setLive(params.has("live"));
  }, []);

  const setScenario = useCallback((s: MockScenario) => {
    scenarioRef.current = s;
    setScenarioState(s);
  }, []);

  const setToken = useCallback((value: string) => {
    const t = value.trim();
    tokenRef.current = t;
    setTokenState(t);
    try {
      window.localStorage.setItem(TOKEN_KEY, t);
    } catch {
      // ignore
    }
  }, []);

  const clearToken = useCallback(() => {
    tokenRef.current = "";
    setTokenState("");
    try {
      window.localStorage.removeItem(TOKEN_KEY);
    } catch {
      // ignore
    }
  }, []);

  // One stable client per mode. Each call delegates to a client built from the latest
  // scenario/token, so changing them never resets the task in progress.
  const client = useMemo<PerceptionClient>(() => {
    if (live) {
      return {
        scan: (req) => createHttpApiClient(tokenRef.current).scan(req),
        verify: (req) => createHttpApiClient(tokenRef.current).verify(req),
      };
    }
    return {
      scan: (req) => createMockApiClient(scenarioRef.current).scan(req),
      async verify(req) {
        const used = scenarioRef.current;
        try {
          return await createMockApiClient(used).verify(req);
        } finally {
          if (used !== "success") setScenario("success"); // one check per chosen scenario
        }
      },
    };
  }, [live, setScenario]);

  const mode = useMemo<ClientMode>(
    () => ({ live, hasToken: token.length > 0, setToken, clearToken, scenario, setScenario }),
    [live, token, setToken, clearToken, scenario, setScenario],
  );

  return (
    <ClientModeContext.Provider value={mode}>
      <TaskClientContext.Provider value={client}>{children}</TaskClientContext.Provider>
    </ClientModeContext.Provider>
  );
}
