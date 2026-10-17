"use client";

// Camera positioning + guided task. One component so the camera and its <video>
// stay mounted across both phases (no restart, no second permission prompt).

import { useCallback, useEffect, useRef, useState } from "react";
import { CameraView } from "../CameraView";
import { DevPanel } from "./DevPanel";
import { BackButton, Button, Card, SimulatedTag, StatusBadge, StepProgress } from "../ui";
import { frameDifference } from "../guidance-math";
import type { TaskController } from "../controller";
import { useClientMode } from "../TaskClientProvider";
import { displayMessage } from "../message";
import { CAMERA_ERROR_TEXT, useCamera } from "@/hooks/useCamera";
import { useHandTracking } from "@/hooks/useHandTracking";
import { useGuidance } from "@/hooks/useGuidance";
import type { Speech } from "@/hooks/useSpeech";

const SCAN_INTERVAL_MS = 2500;
const MOVE_THRESHOLD = 22; // mean gray difference (0-255) that counts as "the panel moved"
const MOVE_CHECKS = 3; // consecutive 500 ms checks
const HAND_CLEAR_MS = 500; // hand must be gone this long before capturing for a check
const HAND_CLEAR_TIMEOUT_MS = 4000;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Controller = TaskController;

export function SessionScreen({
  controller,
  speech,
  onExit,
}: {
  controller: Controller;
  speech: Speech;
  onExit: () => void;
}) {
  const [started, setStarted] = useState(false); // false = camera positioning, true = guided task
  const [preparingCheck, setPreparingCheck] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const mode = useClientMode();
  const camera = useCamera(true);
  const hands = useHandTracking(camera.videoRef, camera.ready);
  const { direction } = useGuidance({
    controller,
    tipRef: hands.tipRef,
    lastSeenRef: hands.lastSeenRef,
    speech,
    // Without a working tracker there is no finger to lose: no directions, no tracking-lost pauses.
    // "Check action" still works, so the routine can be completed by pressing without guidance.
    enabled: started && camera.ready && hands.ready,
  });

  const { status, busy, panelReady, appliance, routine, step, stepIndex, targetControl } = controller;
  const { capture, grabThumb, ready: cameraReady } = camera; // stable callbacks for effect deps
  const ctl = useRef(controller);
  ctl.current = controller;

  // ---- automatic scanning: on setup, and after the camera moved ----
  const refThumb = useRef<Uint8Array | null>(null);
  const scanThumb = useRef<Uint8Array | null>(null);
  useEffect(() => {
    // The controller ignores scans once the panel is ready, so stop capturing then.
    if (!cameraReady || status !== "scanning" || panelReady) return;
    let stopped = false;
    const tick = async () => {
      if (stopped || ctl.current.busy || ctl.current.status !== "scanning") return;
      const frame = capture();
      scanThumb.current = grabThumb();
      if (frame) await ctl.current.scanFrame(frame);
    };
    void tick();
    const id = setInterval(tick, SCAN_INTERVAL_MS);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [cameraReady, capture, grabThumb, status, panelReady]);

  // The frame that produced the current panel map is the reference for movement detection.
  useEffect(() => {
    if (panelReady) refThumb.current = scanThumb.current ?? grabThumb();
  }, [panelReady, controller.controls, grabThumb]);

  // ---- camera movement: pause and re-acquire the panel ----
  // ?steady in the URL turns this off (testing with a moving fake camera, or a demo stand that wobbles).
  const motionCheck = typeof window === "undefined" || !new URLSearchParams(window.location.search).has("steady");
  useEffect(() => {
    if (!started || !cameraReady || !motionCheck) return;
    let strikes = 0;
    const id = setInterval(() => {
      const c = ctl.current;
      const watching = c.status === "guiding" || c.status === "on_target" || c.status === "retry";
      // The hand changes the picture too, so only judge frames without a hand.
      if (!watching || hands.tipRef.current || !refThumb.current) {
        strikes = 0;
        return;
      }
      const diff = frameDifference(refThumb.current, grabThumb());
      strikes = diff > MOVE_THRESHOLD ? strikes + 1 : 0;
      if (strikes >= MOVE_CHECKS) {
        strikes = 0;
        c.reportCameraMoved();
      }
    }, 500);
    return () => clearInterval(id);
  }, [started, cameraReady, grabThumb, hands.tipRef, motionCheck]);

  // ---- actions ----
  const startGuidance = () => {
    speech.unlock();
    setStarted(true);
    controller.startGuidance();
  };

  const checking = useRef(false);
  const onCheck = useCallback(async () => {
    if (checking.current || ctl.current.busy) return;
    checking.current = true;
    setPreparingCheck(true);
    speech.say("Move your hand aside. Checking the display.", "instruction");
    // Wait for an unobstructed view (or give up waiting and let the checker decide).
    const waitStart = performance.now();
    while (performance.now() - waitStart < HAND_CLEAR_TIMEOUT_MS) {
      const gone = !hands.tipRef.current && performance.now() - (hands.lastSeenRef.current || 0) > HAND_CLEAR_MS;
      if (gone) break;
      await wait(100);
    }
    await wait(300); // let the display settle after the press
    const frame = capture();
    setPreparingCheck(false);
    if (frame) await ctl.current.checkAction(frame);
    else speech.say("I couldn't take a picture. Check that the camera is on, then try again.", "instruction");
    checking.current = false;
  }, [capture, hands.tipRef, hands.lastSeenRef, speech]);

  const onRepeat = () => speech.say(displayMessage(controller), "instruction");

  const onPauseToggle = () => {
    if (status === "paused") controller.resume();
    else controller.pause();
  };

  const onRestart = () => {
    if (!appliance || !routine) return;
    setStarted(false);
    controller.selectRoutine(appliance.id, routine.id);
  };

  // ---- view ----
  const totalSteps = routine?.steps.length ?? 0;
  const canCheck = started && !busy && !preparingCheck && ["guiding", "on_target", "retry"].includes(status);
  const instruction = preparingCheck ? "Move your hand aside. Checking the display." : displayMessage(controller);
  const cameraDescription = targetControl
    ? `Camera preview. The target, ${targetControl.label}, is outlined.`
    : "Camera preview of the appliance panel.";

  if (!appliance || !routine) return null;

  return (
    <section className="flex flex-col gap-5">
      {/* 1. Appliance and routine */}
      <div className="flex flex-col gap-1">
        <BackButton onClick={onExit} />
        <h1 tabIndex={-1} className="text-2xl font-bold leading-tight">
          {appliance.name} · {routine.name}
        </h1>
        {appliance.simulated && (
          <p className="mt-1">
            <SimulatedTag />
          </p>
        )}
      </div>
      {started && step && <StepProgress current={Math.min(stepIndex + 1, totalSteps)} total={totalSteps} />}

      {/* 2. Large current instruction (also spoken) */}
      <Card>
        {!started && !camera.error && <SetupIllustration />}
        <p className="text-[28px] font-bold leading-tight" aria-live="polite">
          {camera.error ? CAMERA_ERROR_TEXT[camera.error] : instruction || "Starting the camera."}
        </p>
        {started && direction && status !== "paused" && (
          <p className="mt-3 text-xl font-bold text-link" aria-hidden="true">
            {direction}
          </p>
        )}
      </Card>

      {/* 3. Status in words */}
      {started ? <StatusBadge status={preparingCheck ? "checking" : status} /> : <SetupStatus controller={controller} />}

      {/* 4. Camera with target outline */}
      {/* The video stays mounted even on error, so a retry can attach the stream to it. */}
      <CameraView
        videoRef={camera.videoRef}
        controls={controller.controls}
        target={started ? targetControl : null}
        tipRef={hands.tipRef}
        showAllControls={!started || showAll}
        description={cameraDescription}
      />
      {camera.error && (
        <Button variant="secondary" onClick={camera.retry}>
          Try the camera again
        </Button>
      )}
      {hands.error && (
        <p className="text-lg font-semibold text-bad" role="alert">
          {hands.error} You can still press the button yourself and tap Check.
        </p>
      )}

      {/* 5. Actions */}
      {!started ? (
        <div className="flex flex-col gap-3">
          <p className="text-lg text-muted">Rest the phone on a stand facing the panel, about one to two feet away. Good light helps.</p>
          {status === "paused" ? (
            <Button onClick={() => controller.resume()}>Scan again</Button>
          ) : (
            <Button onClick={startGuidance} disabled={!panelReady || !!camera.error}>
              {panelReady ? "Start guidance" : "Finding the panel…"}
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <Button onClick={onCheck} disabled={!canCheck} className="min-h-20 text-2xl">
            {preparingCheck || status === "checking" ? "Checking…" : "Check"}
          </Button>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" onClick={onRepeat}>
              Repeat
            </Button>
            <Button variant="secondary" onClick={onPauseToggle} disabled={status === "checking" || status === "scanning"}>
              {status === "paused" ? (controller.pauseReason === "unexpected" ? "Resume this step" : "Resume") : "Pause"}
            </Button>
          </div>
          {status === "paused" && controller.pauseReason === "unexpected" && (
            <Button variant="secondary" onClick={onRestart}>
              Restart this routine
            </Button>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2 border-t border-line pt-4">
        <label className="flex min-h-12 items-center gap-3 text-lg">
          <input
            type="checkbox"
            className="h-6 w-6 accent-[var(--primary)]"
            checked={speech.enabled}
            onChange={(e) => speech.setEnabled(e.target.checked)}
          />
          App voice (turn off if you use VoiceOver or TalkBack)
        </label>
        {started && (
          <label className="flex min-h-12 items-center gap-3 text-lg">
            <input type="checkbox" className="h-6 w-6 accent-[var(--primary)]" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
            Outline every detected control
          </label>
        )}
      </div>

      {!mode.live && started && (
        <DevPanel
          scenario={mode.scenario}
          setScenario={mode.setScenario}
          onFakeOnTarget={() => {
            speech.chime();
            controller.reportTargetReached();
          }}
        />
      )}
    </section>
  );
}

function SetupStatus({ controller }: { controller: TaskController }) {
  const { panelReady, busy, missingControls, controls } = controller;
  const text = panelReady
    ? "Panel ready"
    : busy
      ? "Looking for the panel…"
      : controls.length
        ? `Missing ${missingControls.length} control${missingControls.length === 1 ? "" : "s"}`
        : "Looking for the panel…";
  return (
    <p
      className={`inline-flex items-center gap-2 self-start rounded-full px-4 py-2 text-lg font-bold ${
        panelReady ? "bg-good-bg text-good" : "bg-soft text-on-soft"
      }`}
    >
      <span aria-hidden="true">{panelReady ? "✓" : "…"}</span>
      <span className="sr-only">Status: </span>
      {text}
    </p>
  );
}

/** Phone on a stand facing a panel: how to set up, at a glance. */
function SetupIllustration() {
  return (
    <svg width="100%" height="88" viewBox="0 0 260 88" className="mb-3" aria-hidden="true">
      <rect x="150" y="10" width="96" height="68" rx="12" fill="var(--soft)" stroke="var(--line)" strokeWidth="2" />
      <rect x="164" y="22" width="40" height="14" rx="3" fill="var(--card)" />
      {[0, 1, 2].map((c) =>
        [0, 1].map((r) => <circle key={`${c}-${r}`} cx={170 + c * 16} cy={50 + r * 14} r="5" fill="var(--primary)" opacity={c === 2 && r === 1 ? 1 : 0.35} />),
      )}
      <path d="M118 44h22" stroke="var(--muted)" strokeWidth="2" strokeDasharray="4 4" />
      <rect x="62" y="14" width="40" height="64" rx="8" fill="var(--card)" stroke="var(--ink)" strokeWidth="3" />
      <circle cx="96" cy="22" r="3" fill="var(--ink)" />
      <path d="M58 86l14-12M106 86l-14-12" stroke="var(--muted)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
