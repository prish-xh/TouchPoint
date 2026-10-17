# Shared foundation handoff

This milestone adds shared types, a public catalog with one simulated microwave routine,
and an offline mock perception client. It does not connect or modify the frontend.

- `types/touchpoint.ts`: existing frontend domain shapes promoted unchanged; original
  `TaskController` contract plus `FrontendTaskController` with the frontend's additions:
  `startGuidance`, `busy`, `pauseReason`, and `missingControls`.
- `lib/catalog.ts`: `APPLIANCES` and `findAppliance`. Only microwave is supported here.
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
The future hook should implement the frontend extension before the teammate changes
`components/controller.ts`. Do not swap it now: the real hook does not exist yet.

## Sponsor integrations (added after foundation)

Server adapters and authenticated routes now exist for Perceptron localization/OCR,
Gemini catalog suggestions, and Backboard opt-in preference memory. See
[the track plan](docs/tracks/PLAN.md) and [setup/handoff](docs/tracks/INTEGRATION.md).
`createHttpApiClient(token)` shares the mock client's `PerceptionClient` interface.
The frontend remains unchanged and the real controller is still pending.

No live provider calls, VEYZL audit, cloud deployment or track submissions have been
performed. Credentials, event entitlement, and actual-appliance validation remain
required. Perceptron verification currently always returns uncertain; the simulated
catalog cannot authorize live guidance. Public API documentation sources are linked
in the track plan. No undocumented sponsor endpoints were invented.
