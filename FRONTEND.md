# Touchpoint frontend (interface, camera, tracking, speech)

Owner: Prisha. Works today against a temporary mock controller; switches to the teammate's real controller by changing one file.

## Files in this half

| File | What it does |
|---|---|
| `app/page.tsx` | Screen flow: Home → Routine → Session (camera setup + guided task) → Result. Speaks each new controller message. |
| `app/globals.css` | Agreed palette (#F8FAFC / #0F172A / #1D4ED8), 18px base text, visible focus. |
| `app/layout.tsx` | Root layout (needed by Next.js; keep whichever version is in the repo). |
| `components/controller.ts` | **The one swap point** between this UI and the teammate's controller. |
| `components/screens/*` | Home, Routine, Session, Result screens, and the mock-only test panel. |
| `components/CameraView.tsx` | Letterboxed, unmirrored preview with target outline and fingertip dot. |
| `components/guidance-math.ts` | Pure math: on-target test, directions, frame-to-screen mapping, motion check. Unit-tested. |
| `components/ui.tsx` | Buttons, cards, status badge (status always in words). |
| `hooks/useCamera.ts` | Rear camera, capture fresh frames as JPEG data URLs with unique capture IDs, clear permission errors, stops tracks on exit. |
| `hooks/useHandTracking.ts` | MediaPipe index fingertip, local only. Fingertip kept in a ref (no per-frame re-renders). |
| `hooks/useGuidance.ts` | Throttled spoken directions, one chime on target, reports target reached / tracking lost. |
| `hooks/useSpeech.ts` | Instructions interrupt; directions never cut off an instruction. Chime. Repeat. App-voice toggle. |
| `components/mock/*` | **Temporary** stand-in for the teammate's types, catalog, and controller. Delete after the swap. |
| `scripts/copy-mediapipe-wasm.mjs` | Copies MediaPipe's runtime into `public/` on `npm install`, so tracking doesn't depend on a CDN. |

## Run it

```bash
npm install          # also copies the MediaPipe runtime into public/
npm run dev          # http://localhost:3000 on a laptop
npm test             # unit tests
```

The phone camera requires HTTPS: deploy to Vercel (preferred) or run `ngrok http 3000` and open the https link.

Useful while testing:
- **Mock test controls** (bottom of the guided screen, mock mode only): choose the result of the next check (success, missed press, wrong setting, unreadable display, API failure) and "Pretend my finger is on target".
- `?steady` in the URL turns off camera-movement detection (for wobbly stands or testing on a laptop).

## Behaviour that follows the plan

- Reaching the target says "On target. Press X." and plays one chime. It never counts as a press; only the controller's matched check advances.
- **Check action:** says "Move your hand aside. Checking the display.", waits until the hand is out of view (up to 4 s), captures a fresh frame, sends it to the controller. Disabled while a check is in flight (no overlapping requests).
- Hand lost for 1.2 s while steering → controller pauses; guidance resumes when the hand returns.
- Panel looks different for 1.5 s with no hand in view → `reportCameraMoved()`; the app re-scans automatically before guiding again.
- If hand tracking can't load, the app says so and the routine still works: press the button yourself, then Check action.
- App voice can be turned off for VoiceOver/TalkBack users; every instruction is also on screen in an `aria-live` region.

## For the teammate: the controller contract this UI uses

Defined (temporarily) in `components/mock/contract.ts`. One addition beyond the original proposal: `startGuidance()`.

```ts
type TaskStatus = "idle" | "scanning" | "guiding" | "on_target" | "checking" | "retry" | "paused" | "done";
type PauseReason = "tracking_lost" | "camera_moved" | "unexpected" | "user" | null;

useTaskController(): {
  status: TaskStatus;
  appliance: Appliance | null;  routine: Routine | null;
  step: Step | null;  stepIndex: number;
  targetControl: DetectedControl | null;   // normalized 0-1 box + label
  controls: DetectedControl[];  panelReady: boolean;  missingControls: string[];
  message: string;                          // the UI speaks this whenever it changes
  lastResult: VerifyResponse | null;  pauseReason: PauseReason;
  busy: boolean;                            // scan or check in flight

  selectRoutine(applianceId, routineId): void;   // -> status "scanning"
  scanFrame({ dataUrl, captureId }): Promise<void>;
  startGuidance(): void;                          // NEW: "Panel ready" -> "guiding"
  checkAction({ dataUrl, captureId }): Promise<void>;
  reportTargetReached(): void;  reportTrackingLost(): void;  reportCameraMoved(): void;
  pause(): void;  resume(): void;  reset(): void;
}
```

Expectations the UI relies on:
- `status === "scanning"` means "a scan is needed": the UI captures and calls `scanFrame` every 2.5 s until it isn't. After `reportCameraMoved()`, set `"scanning"`; a successful scan should return to `"guiding"` on the same step.
- `message` is the single sentence to speak and show. Change it on every state change the user needs to hear.
- When tracking is lost, pause with `pauseReason: "tracking_lost"`; the UI calls `resume()` when the finger returns.
- Also needed: the appliance catalog (`APPLIANCES`) for the Home and Routine screens.

## Switching to the real controller

Edit only `components/controller.ts`:

```ts
export { useTaskController } from "@/hooks/useTaskController";
export type { Appliance, Box, DetectedControl, Frame, PauseReason, Point, Routine, Step, TaskController, TaskStatus, VerifyResponse } from "@/types/touchpoint";
export { APPLIANCES } from "@/lib/catalog"; // wherever the teammate exports it
export const IS_MOCK = false;
// MockScenario: export a placeholder type, or remove the DevPanel import from SessionScreen.
```

Then delete `components/mock/`. Any type-name differences show up as TypeScript errors in `components/` only.

## Still to check on the real phone

- Camera, speech, and chime on the demo phone (iPhone: silent switch off).
- Hand model downloads on first use (~7.5 MB from Google). For an offline demo, save it into `public/mediapipe/` and update `MODEL_URL` in `hooks/useHandTracking.ts`.
- Direction words: "right" means the camera image's right. With the phone behind the hand facing the panel, that matches the user's right; confirm on the stand.
- VoiceOver / TalkBack pass through every screen.
