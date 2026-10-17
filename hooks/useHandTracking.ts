"use client";

// Local index-fingertip tracking with MediaPipe Hand Landmarker.
// Runs entirely in the browser; frames are never sent to the backend.
// The fingertip lives in a ref (updated every frame) so the overlay and guidance
// can read it without re-rendering React 30 times a second.

import { useEffect, useRef, useState, type RefObject } from "react";
import type { Point } from "@/components/controller";

// WebAssembly runtime served from public/ (scripts/copy-mediapipe-wasm.mjs runs on npm install),
// so it always matches the installed @mediapipe/tasks-vision version and needs no CDN.
const WASM_URL = "/mediapipe/wasm";
// The hand model (~7.5 MB) still downloads from Google on first use. For an offline demo,
// save it to public/mediapipe/hand_landmarker.task and point this at "/mediapipe/hand_landmarker.task".
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const INDEX_TIP = 8;

type Landmarker = {
  detectForVideo: (video: HTMLVideoElement, ts: number) => { landmarks?: { x: number; y: number }[][] };
  close: () => void;
};

export type HandTracking = {
  tipRef: RefObject<Point | null>;
  /** Timestamp (performance.now) when a fingertip was last seen. */
  lastSeenRef: RefObject<number>;
  handVisible: boolean;
  ready: boolean;
  error: string | null;
};

export function useHandTracking(videoRef: RefObject<HTMLVideoElement | null>, enabled: boolean): HandTracking {
  const tipRef = useRef<Point | null>(null);
  const lastSeenRef = useRef<number>(0);
  const landmarkerRef = useRef<Landmarker | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [handVisible, setHandVisible] = useState(false);

  // Load the model once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
        const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
        const options = (delegate: "GPU" | "CPU") => ({
          baseOptions: { modelAssetPath: MODEL_URL, delegate },
          runningMode: "VIDEO" as const,
          numHands: 1,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        let lm: Landmarker;
        try {
          lm = (await HandLandmarker.createFromOptions(fileset, options("GPU"))) as unknown as Landmarker;
        } catch {
          lm = (await HandLandmarker.createFromOptions(fileset, options("CPU"))) as unknown as Landmarker;
        }
        if (cancelled) return lm.close();
        landmarkerRef.current = lm;
        setReady(true);
      } catch (err) {
        console.error("Hand tracking failed to load", err);
        if (!cancelled) setError("Hand tracking could not load. Check the internet connection and reload.");
      }
    })();
    return () => {
      cancelled = true;
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    };
  }, []);

  // Per-frame loop.
  useEffect(() => {
    if (!enabled || !ready) {
      tipRef.current = null;
      setHandVisible(false);
      return;
    }
    let raf = 0;
    let lastVideoTime = -1;
    let visible = false;

    const loop = () => {
      const video = videoRef.current;
      const lm = landmarkerRef.current;
      if (video && lm && video.readyState >= 2 && video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        const now = performance.now();
        const result = lm.detectForVideo(video, now);
        const hand = result.landmarks?.[0];
        const tip = hand?.[INDEX_TIP];
        if (tip) {
          tipRef.current = { x: tip.x, y: tip.y };
          lastSeenRef.current = now;
        } else {
          tipRef.current = null;
        }
        if (Boolean(tip) !== visible) {
          visible = Boolean(tip);
          setHandVisible(visible);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [enabled, ready, videoRef]);

  return { tipRef, lastSeenRef, handVisible, ready, error };
}
