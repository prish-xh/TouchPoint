# Backend integration and live verification

## Setup

Copy `.env.example` to `.env.local` and fill only the services being tested. Never use
NEXT_PUBLIC prefixes for provider keys. Set a random private TOUCHPOINT_DEMO_TOKEN
(e.g. generate with `openssl rand -hex 32`). Restart `npm run dev` after env changes.
All routes require `Authorization: Bearer <TOUCHPOINT_DEMO_TOKEN>`; absent config
returns 503 and a wrong token returns 401. This is a single-operator demo, not a
multi-user authorization system. Add user sessions, quotas and rate limiting before
public access. Do not embed the demo token in source or share it with the public.

| Route | Body | Purpose |
| --- | --- | --- |
| POST /api/scan | `{applianceId,routineId,frame:{dataUrl,captureId}}` | Perceptron observations |
| POST /api/verify | Same plus `stepId` | OCR observation; currently always uncertain |
| POST /api/routines/suggest | `{intent:"Set 30 seconds on my microwave"}` | Gemini catalog suggestion; must be confirmed |
| GET /api/preferences | None | Backboard preference read |
| PUT /api/preferences | `{consent:true,preferences:{speechRate:0.8,instructionDetail:"brief",appVoice:true}}` | Explicitly consented save |
| DELETE /api/preferences | None | Delete only the configured preference record |

Images must be base64 JPEG/PNG data URLs under 3 million characters. Only supported
catalog IDs are accepted. Requests and provider responses have size bounds; upstream
calls have 20-second timeouts except detection (60 seconds). Upstream error content is never returned or logged.
Our app does not persist camera images. Providers receive live request contents and
have their own retention policies: review those and disclose uploads before real use.

## Perceptron

Set the event key and a model your account can access. Current public docs show
`perceptron-mk1.5`; confirm with the workshop before using an event-specific model.
Scan uses the official /v1/detect endpoint and converts its pixel boxes after backend
orientation normalization. OCR uses chat completions with our requested JSON Schema.
Test scan on an appliance photo and compare every box to the actual image. Duplicate,
unknown, or out-of-frame controls cannot be used for guidance. A simulated profile
never returns panelReady=true. Verification reads text but always returns uncertain
because no actual appliance has physically validated success criteria yet.
Do not simply remove that guard to make a demo progress. Add reviewed per-step rules
and tests using actual appliance observations; a single countdown image does not prove
that Start was pressed. Mock verification is still available offline and clearly separate.

## Gemini

Set GEMINI_API_KEY and GEMINI_MODEL to an available generateContent model. Call the
suggest route with supported, ambiguous, and unsupported intents. Output must stay
inside APPLIANCES. The server never exposes model-written action instructions and
always requires confirmation. A valid catalog ID does not guarantee intent accuracy;
the UI must show the routine's name/goal for confirmation. The endpoint never selects,
starts or advances a routine. Do not submit camera frames here.

## Backboard

Create a dedicated assistant and a single preference memory using the account UI or
the documented POST /assistants/{assistant_id}/memories endpoint. Initialize content
to the JSON preference object shown above; use a demo persona, not personal details.
Get the memory ID from the documented list/get API and set both IDs in .env.local.
The app uses only that server-configured record; no request can choose another user.
Read, change with consent:true, restart the app, and read again to demonstrate persistence.
Delete removes that record; recreate and configure a new record before saving again.
No images, disability details, names, conversations or action histories are accepted.
For multiple users, replace the fixed IDs with an authenticated ownership mapping.

## Frontend handoff (no frontend files changed)

`createHttpApiClient(demoToken)` in lib/api-client.ts implements the same
PerceptionClient as the mock client. It validates server responses and capture/step IDs.
The real controller now prevents overlapping requests, stale updates and progression
on uncertain results. Configure its TaskClientContext with a stable client; see
BACKEND.md for the bridge type alias and provider example. The teammate should connect
live guidance only after physical profile rules are ready. Gemini suggestion and
Backboard settings additionally need teammate-owned UI, including confirmation/consent.
The current page still uses components/mock and is not a live sponsor demonstration.

## Vultr deployment package

Dockerfile builds the existing Next app using Node 22 and runs as the node user.
.dockerignore excludes secrets and local artifacts. No cloud account was provisioned.
Docker is not installed in the local environment, so this container is unverified.
On a Docker-capable Vultr instance, after copying the repository and supplying a
server-only env file:

```sh
docker build -t touchpoint .
docker run --name touchpoint --restart unless-stopped --env-file .env.local -p 127.0.0.1:3000:3000 -d touchpoint
```

Put an HTTPS reverse proxy in front, keep app port 3000 private, and configure a domain.
Supply the domain/instance first so proxy configuration can be concrete. Camera access
on the phone requires HTTPS. Show the actual deployed instance and HTTPS demo when
submitting to Vultr; a Dockerfile alone is not infrastructure usage. No deployment,
domain purchase or provider charges were initiated by this work.

## Validation

`npm test`, `npm run typecheck`, `npm run build`.
Tests use mocked HTTP responses; they prove local behavior, not provider connectivity.
For each live run record service/model, date, operation, sanitized outcome, and demo
clip link. Keep tokens/images out of evidence. Track requirements live in PLAN.md.
