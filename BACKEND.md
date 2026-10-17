# Shared foundation handoff

This milestone adds shared types, a public catalog with simulated microwave, laundry and stove-timer routines,
and an offline mock perception client. It does not connect or modify the frontend.

- `types/touchpoint.ts`: existing frontend domain shapes promoted unchanged; original
  `TaskController` contract plus `FrontendTaskController` with the frontend's additions:
  `startGuidance`, `busy`, `pauseReason`, and `missingControls`.
- `lib/catalog.ts`: `APPLIANCES` and `findAppliance`. All three simulated profiles are supported.
- `profiles/microwave.ts`: SIM-MW1, routine `set_30_seconds`, steps `press_3`,
  `press_0`, `press_start`. IDs match the frontend mock.
- `fixtures/microwave.ts`: synthetic bounding boxes and readings. These are not checked
  physical-appliance profiles; a decreasing reading is only a mock observation.
- `lib/api-client.ts`: `createMockApiClient(scenario)` implements `PerceptionClient`.

```ts
import { createMockApiClient } from "@/lib/api-client";
const client = createMockApiClient("success");
const request = {
  applianceId: "microwave",
  routineId: "set_30_seconds",
  frame: { dataUrl: "data:image/jpeg;base64,ZGVtbw==", captureId: "demo-1" },
};
const panel = await client.scan(request);
const result = await client.verify({ ...request, stepId: "press_3" });
```

Scenarios are fixed per client: `success`, `wrong_setting`, `unreadable`,
`api_failure`, and `missed_press`. Failure rejects with `ApiClientError`;
wrong setting returns `mismatched`; unreadable returns `uncertain` with no observation.
An unreadable scan returns no controls and is not ready. Wrong-setting/missed-press
scenarios affect verification only. No client changes routine progression.
Capture and step identifiers are echoed for future stale-response checks.

Run `npm test` and `npm run typecheck`. `npm run build` checks production compilation.
The running UI still uses `components/mock/`; these additions do not change it.
The real hook now implements the frontend extension. See the controller handoff below
before the teammate changes `components/controller.ts`. Live profile validation remains pending.

## Sponsor integrations (added after foundation)

Server adapters and authenticated routes now exist for Perceptron localization/OCR,
Gemini catalog suggestions, and Backboard opt-in preference memory. See
[the track plan](docs/tracks/PLAN.md) and [setup/handoff](docs/tracks/INTEGRATION.md).
`createHttpApiClient(token)` shares the mock client's `PerceptionClient` interface.
The frontend remains unchanged. The real controller and engine are now implemented;
see the handoff below for explicit client configuration.

No live provider calls, VEYZL audit, cloud deployment or track submissions have been
performed. Credentials, event entitlement, and actual-appliance validation remain
required. Perceptron verification currently always returns uncertain; the simulated
catalog cannot authorize live guidance. Public API documentation sources are linked
in the track plan. No undocumented sponsor endpoints were invented.

## Real controller handoff

- `lib/task-engine.ts`: framework-independent state and async request coordination.
- `hooks/useTaskController.ts`: zero-argument hook returning `FrontendTaskController`.
- `tests/task-engine.test.ts`: progression, response validation, and race regressions.

The hook retains all original fields/actions and adds the existing frontend's
`startGuidance`, `busy`, `pauseReason`, and `missingControls`. When switching the
frontend bridge, export `FrontendTaskController as TaskController` for its type;
the original shared `TaskController` remains the smaller originally agreed contract.
Do not replace the frontend bridge's type with that smaller type.

Supply a stable `PerceptionClient` through `TaskClientContext.Provider` above the
component calling `useTaskController`. The teammate owns that wrapper/bridge change.
For live requests use `createHttpApiClient(privateDemoToken)`; for explicit offline
testing use `createMockApiClient()`. Memoize the client: changing its identity creates
a fresh task engine. There is no implicit mock fallback and no browser sponsor key.
An unconfigured hook fails closed when asked to scan.

Example wiring for the teammate (not applied to any frontend file):

```tsx
const client = useMemo(() => createHttpApiClient(demoToken), [demoToken]);
return <TaskClientContext.Provider value={client}><TaskScreen /></TaskClientContext.Provider>;
// TaskScreen calls useTaskController(); the provider must be above that caller.
```

Behavior:
- Select -> scan -> ready -> explicit Start guidance. Ready setup does not repeat scans.
- Target reached only changes guidance; a matched check advances exactly one step.
- Uncertain results/API check failures retry on the same step. Mismatch pauses for
  review; Resume stays on the same step, Restart begins from step zero.
- Tracking loss pauses guidance. User pause cannot be overridden by a tracking report.
- Camera movement clears boxes, invalidates pending work, and requires a new scan.
  Movement while manually paused preserves that pause; Resume scans before guiding.
- Pause, reset, selection, movement and hook cleanup invalidate outstanding replies.
- One transport request at a time, including obsolete calls awaiting completion.
  `busy` may remain true after reset/pause until that call settles. HTTP calls time out
  through the existing client. Injected clients must also settle or implement a timeout.
- Reusing a capture ID in the same task is rejected; capture a fresh frame for retries.
- Response shapes/IDs and panel bounds/control IDs are validated even for injected clients.
- Completion uses stepIndex == steps.length, step == null and targetControl == null.

No frontend files were edited or switched. The current live adapter still returns
uncertain verification and panelReady=false for simulated profiles. Keep that gate
until actual appliance observations and per-step verification criteria are checked.
No paid API calls are used by controller tests.

## Additional appliances and native detection

See [appliance profiles](docs/APPLIANCE-PROFILES.md) for laundry/stove backend routines,
fixture scenarios and live-validation requirements. Scan now uses Perceptron's native
pixel-box detector with backend orientation normalization, while OCR uses chat
completions. Live results and latency are documented in the photo-test report.

## Integration branch update

The latest main already connects the frontend to the real hook via TaskClientProvider.
This backend update preserves those files unchanged. The earlier handoff instructions
above describe the original foundation stage, not an outstanding frontend switch.
Default mode is explicit mock perception; ?live uses the protected backend routes.
A complete detected map with panelReady=false now pauses instead of repeatedly scanning
an unapproved profile. Physically checked rules and phone tests are still required.
GitHub Actions now runs tests, typecheck, and build on PRs; no provider keys are required.
