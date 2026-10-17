"use client";

// Spoken instructions and directions, plus the on-target chime.
//  - "instruction": the current step/result message. Interrupts everything.
//  - "direction": short steering prompts. Never cuts off an instruction, only an older direction.
// unlock() must be called from a tap (iOS blocks audio until then).

import { useCallback, useEffect, useRef, useState } from "react";

export type Priority = "instruction" | "direction";

export function useSpeech() {
  const [enabled, setEnabled] = useState(true);
  const enabledRef = useRef(true);
  const speakingInstruction = useRef(false);
  const lastInstruction = useRef("");
  const audioCtx = useRef<AudioContext | null>(null);

  useEffect(() => {
    enabledRef.current = enabled;
    if (!enabled && typeof window !== "undefined") window.speechSynthesis?.cancel();
  }, [enabled]);

  const unlock = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      if (!audioCtx.current) {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (Ctor) audioCtx.current = new Ctor();
      }
      void audioCtx.current?.resume();
    } catch {
      // audio is optional
    }
    // A silent utterance inside the tap unlocks speech on iOS Safari.
    if (window.speechSynthesis) window.speechSynthesis.speak(new SpeechSynthesisUtterance(""));
  }, []);

  const say = useCallback((text: string, priority: Priority = "instruction") => {
    if (!text || !enabledRef.current || typeof window === "undefined" || !window.speechSynthesis) return;
    const synth = window.speechSynthesis;
    if (priority === "direction" && speakingInstruction.current) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.05;
    if (priority === "instruction") {
      lastInstruction.current = text;
      speakingInstruction.current = true;
      const done = () => {
        speakingInstruction.current = false;
      };
      u.onend = done;
      u.onerror = done;
    }
    synth.speak(u);
  }, []);

  const repeat = useCallback(() => {
    if (lastInstruction.current) say(lastInstruction.current, "instruction");
  }, [say]);

  const cancel = useCallback(() => {
    speakingInstruction.current = false;
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  }, []);

  /** Two short rising tones: "on target". */
  const chime = useCallback(() => {
    // Plays even when app voice is off: VoiceOver/TalkBack users still need the on-target cue.
    const ctx = audioCtx.current;
    if (!ctx) return;
    const now = ctx.currentTime;
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = now + i * 0.12;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  }, []);

  useEffect(() => () => cancel(), [cancel]);

  return { say, repeat, cancel, chime, unlock, enabled, setEnabled };
}

export type Speech = ReturnType<typeof useSpeech>;
