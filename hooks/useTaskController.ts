"use client";

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { createTaskEngine } from "@/lib/task-engine";
import type { FrontendTaskController, PerceptionClient } from "@/types/touchpoint";

/** Supply a stable client through Provider; never put a sponsor key in browser code.
 * For live use: createHttpApiClient(privateDemoAccessToken).
 * Tests or explicit demo screens may supply createMockApiClient().
 */
export const TaskClientContext = createContext<PerceptionClient | null>(null);
const unconfigured: PerceptionClient = {
  async scan() { throw new Error("TaskClientContext is not configured"); },
  async verify() { throw new Error("TaskClientContext is not configured"); },
};

/** Original zero-argument hook plus the frontend's four existing additive fields. */
export function useTaskController(): FrontendTaskController {
  const client = useContext(TaskClientContext) ?? unconfigured;
  const engine = useMemo(() => createTaskEngine(client), [client]);
  const snapshot = useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getSnapshot);
  useEffect(() => () => engine.cancelPending(), [engine]);
  return {
    ...snapshot,
    selectRoutine: engine.selectRoutine, scanFrame: engine.scanFrame,
    startGuidance: engine.startGuidance, checkAction: engine.checkAction,
    reportTargetReached: engine.reportTargetReached, reportTrackingLost: engine.reportTrackingLost,
    reportCameraMoved: engine.reportCameraMoved, pause: engine.pause, resume: engine.resume, reset: engine.reset,
  };
}
