"use client";

// Rear camera, unmirrored preview, fresh frame capture as JPEG data URLs.
// Frame capture is independent of the UI so the controller flow can request a new image any time.

import { useCallback, useEffect, useRef, useState } from "react";
import { toGray } from "@/components/guidance-math";
import type { Frame } from "@/components/controller";

export type CameraError = "insecure" | "unsupported" | "denied" | "not_found" | "in_use" | "unknown";

export const CAMERA_ERROR_TEXT: Record<CameraError, string> = {
  insecure: "The camera only works over a secure (https) link. Open the app's https address.",
  unsupported: "This browser can't use the camera. Try Safari on iPhone or Chrome on Android.",
  denied: "Camera access was blocked. Allow camera access for this site in your browser settings, then tap Try again.",
  not_found: "No camera was found on this device.",
  in_use: "The camera is being used by another app. Close it, then tap Try again.",
  unknown: "The camera could not start. Tap Try again.",
};

const MAX_CAPTURE_WIDTH = 1280;
const JPEG_QUALITY = 0.85;
const THUMB_W = 64;
const THUMB_H = 48;

function newCaptureId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `cap-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function classify(err: unknown): CameraError {
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "denied";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "not_found";
  if (name === "NotReadableError" || name === "AbortError") return "in_use";
  return "unknown";
}

export function useCamera(active: boolean) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const thumbCanvas = useRef<HTMLCanvasElement | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<CameraError | null>(null);
  const [attempt, setAttempt] = useState(0);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setReady(false);
  }, []);

  useEffect(() => {
    if (!active) {
      stop();
      return;
    }
    let cancelled = false;

    (async () => {
      setError(null);
      if (!window.isSecureContext) return setError("insecure");
      if (!navigator.mediaDevices?.getUserMedia) return setError("unsupported");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play().catch(() => undefined);
        if (!video.videoWidth) {
          await new Promise<void>((r) => video.addEventListener("loadedmetadata", () => r(), { once: true }));
        }
        if (!cancelled) setReady(true);
      } catch (err) {
        if (!cancelled) setError(classify(err));
      }
    })();

    return () => {
      cancelled = true;
      stop();
    };
  }, [active, attempt, stop]);

  /** A fresh full frame (never cropped, never mirrored) with a unique capture ID. */
  const capture = useCallback((): Frame | null => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    const scale = Math.min(1, MAX_CAPTURE_WIDTH / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    return { dataUrl: canvas.toDataURL("image/jpeg", JPEG_QUALITY), captureId: newCaptureId() };
  }, []);

  /** Tiny grayscale frame for detecting whether the phone moved. */
  const grabThumb = useCallback((): Uint8Array | null => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    if (!thumbCanvas.current) {
      thumbCanvas.current = document.createElement("canvas");
      thumbCanvas.current.width = THUMB_W;
      thumbCanvas.current.height = THUMB_H;
    }
    const ctx = thumbCanvas.current.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, THUMB_W, THUMB_H);
    return toGray(ctx.getImageData(0, 0, THUMB_W, THUMB_H).data);
  }, []);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { videoRef, ready, error, capture, grabThumb, retry, stop };
}
