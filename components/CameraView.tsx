"use client";

// Live, unmirrored, letterboxed camera preview with the target outline and fingertip
// drawn on top. The overlay is a visual aid only; everything essential is also spoken and written.

import { useEffect, useRef, type RefObject } from "react";
import type { DetectedControl, Point } from "./controller";
import { containLayout } from "./guidance-math";

export function CameraView({
  videoRef,
  controls,
  target,
  tipRef,
  showAllControls,
  description,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  controls: DetectedControl[];
  target: DetectedControl | null;
  tipRef: RefObject<Point | null>;
  showAllControls: boolean;
  description: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Latest props for the draw loop without restarting it.
  const props = useRef({ controls, target, showAllControls });
  props.current = { controls, target, showAllControls };

  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (canvas && video) {
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const w = Math.round(rect.width * dpr);
        const h = Math.round(rect.height * dpr);
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.clearRect(0, 0, rect.width, rect.height);
          if (video.videoWidth) {
            // Recomputed every frame, so rotation and resizing stay aligned.
            const layout = containLayout(video.videoWidth, video.videoHeight, rect.width, rect.height);
            const { controls: all, target: tgt, showAllControls: showAll } = props.current;

            ctx.font = "600 15px system-ui, sans-serif";
            ctx.textBaseline = "bottom";
            if (showAll) {
              for (const c of all) {
                if (tgt && c.controlId === tgt.controlId) continue;
                const b = layout.box(c);
                ctx.lineWidth = 2;
                ctx.strokeStyle = "rgba(255,255,255,0.85)";
                ctx.strokeRect(b.x, b.y, b.w, b.h);
              }
            }
            if (tgt) {
              const b = layout.box(tgt);
              ctx.lineWidth = 4;
              ctx.strokeStyle = "#FACC15";
              ctx.fillStyle = "rgba(250, 204, 21, 0.18)";
              ctx.fillRect(b.x, b.y, b.w, b.h);
              ctx.strokeRect(b.x, b.y, b.w, b.h);
              const label = `Target: ${tgt.label}`;
              const tw = ctx.measureText(label).width + 12;
              const ly = Math.max(22, b.y - 4);
              ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
              ctx.fillRect(b.x, ly - 22, tw, 22);
              ctx.fillStyle = "#fff";
              ctx.fillText(label, b.x + 6, ly - 3);
            }
            const tip = tipRef.current;
            if (tip) {
              const p = layout.point(tip);
              ctx.beginPath();
              ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
              ctx.fillStyle = "#EC4899";
              ctx.fill();
              ctx.lineWidth = 3;
              ctx.strokeStyle = "#fff";
              ctx.stroke();
            }
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [videoRef, tipRef]);

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl bg-camera">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-contain"
        playsInline
        muted
        autoPlay
        aria-hidden="true"
      />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" role="img" aria-label={description} />
    </div>
  );
}
