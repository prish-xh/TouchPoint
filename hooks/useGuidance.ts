"use client";

// Turns the live fingertip into short spoken directions toward the current target.
//  - Directions are throttled: only when they change, or repeated after a quiet gap.
//  - On target (held briefly): one chime, then the controller is told. The controller
//    decides what to say; reaching the target never counts as a press.
//  - Lost hand while steering: tell the controller (it pauses); resume when the hand returns.

import { useEffect, useRef, useState, type RefObject } from "react";
import type { Point, TaskController } from "@/components/controller";
import { directionSentence, guide, spokenLabel } from "@/components/guidance-math";
import type { Speech } from "./useSpeech";

const TICK_MS = 150;
const MIN_GAP_MS = 1300; // between different directions
const REPEAT_MS = 3500; // repeat the same direction after this long
const ON_TARGET_TICKS = 3; // ~0.45 s on target before announcing
const LOST_MS = 1200; // hand missing this long while steering => pause
const OFF_TARGET_MS = 1500; // after "on target", moving away this long => steer again

export function useGuidance(opts: {
  controller: TaskController;
  tipRef: RefObject<Point | null>;
  lastSeenRef: RefObject<number>;
  speech: Speech;
  enabled: boolean;
}) {
  const { controller, tipRef, lastSeenRef, speech, enabled } = opts;
  const [direction, setDirection] = useState<string>("");

  // Keep the latest values without restarting the interval every render.
  const ctl = useRef(controller);
  ctl.current = controller;
  const sp = useRef(speech);
  sp.current = speech;

  const lastSpoken = useRef({ text: "", at: 0 });
  const onTargetTicks = useRef(0);
  const offTargetSince = useRef<number | null>(null);
  const lostReported = useRef(false);
  const wasSteering = useRef(false);

  // Reset per step so a new target starts fresh.
  const stepId = controller.step?.id;
  useEffect(() => {
    lastSpoken.current = { text: "", at: performance.now() }; // let the step instruction finish first
    onTargetTicks.current = 0;
    offTargetSince.current = null;
    lostReported.current = false;
    setDirection("");
  }, [stepId]);

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      const c = ctl.current;
      const target = c.targetControl;
      const now = performance.now();
      const steering = c.status === "guiding" || c.status === "retry";
      const holding = c.status === "on_target";
      const lostPause = c.status === "paused" && c.pauseReason === "tracking_lost";
      // Entering a steering phase (new step, or a retry on the same step) starts the on-target count fresh.
      if (steering && !wasSteering.current) onTargetTicks.current = 0;
      wasSteering.current = steering;
      if (!target || !(steering || holding || lostPause)) return;

      const tip = tipRef.current;
      if (!tip) {
        onTargetTicks.current = 0;
        if (steering && !lostReported.current && now - (lastSeenRef.current || 0) > LOST_MS) {
          lostReported.current = true;
          c.reportTrackingLost();
        }
        return;
      }

      if (lostPause) {
        lostReported.current = false;
        c.resume();
        return;
      }
      lostReported.current = false;

      const g = guide(tip, target);
      const label = spokenLabel(target.label);

      if (g.onTarget) {
        offTargetSince.current = null;
        onTargetTicks.current += 1;
        if (steering && onTargetTicks.current === ON_TARGET_TICKS) {
          sp.current.chime();
          setDirection(`On target: ${target.label}`);
          c.reportTargetReached(); // controller message ("On target. Press ...") is spoken by the page
        }
        return;
      }

      onTargetTicks.current = 0;
      const sentence = directionSentence(g, label);

      if (holding) {
        // They were on target but drifted off before pressing: steer again after a moment.
        offTargetSince.current ??= now;
        if (now - offTargetSince.current < OFF_TARGET_MS) return;
      }

      setDirection(sentence);
      const { text, at } = lastSpoken.current;
      const changed = sentence !== text;
      if ((changed && now - at > MIN_GAP_MS) || now - at > REPEAT_MS) {
        sp.current.say(holding ? `You moved off ${label}. ${sentence}` : sentence, "direction");
        lastSpoken.current = { text: sentence, at: now };
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, [enabled, tipRef, lastSeenRef]);

  return { direction };
}
