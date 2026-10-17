import { describe, expect, it } from "vitest";
import {
  containLayout, contains, directionSentence, frameDifference, guide, spokenLabel, toGray,
} from "@/components/guidance-math";

const start = { x: 0.6, y: 0.7, w: 0.1, h: 0.1 }; // center (0.65, 0.75)

describe("guide", () => {
  it("is on target inside the box, with a small forgiveness pad", () => {
    expect(guide({ x: 0.65, y: 0.75 }, start).onTarget).toBe(true);
    expect(guide({ x: 0.705, y: 0.75 }, start).onTarget).toBe(true); // within pad
    expect(guide({ x: 0.75, y: 0.75 }, start).onTarget).toBe(false);
  });

  it("steers along the axis that is further off", () => {
    expect(guide({ x: 0.2, y: 0.7 }, start)).toMatchObject({ direction: "right", small: false });
    expect(guide({ x: 0.9, y: 0.74 }, start)).toMatchObject({ direction: "left" });
    expect(guide({ x: 0.64, y: 0.2 }, start)).toMatchObject({ direction: "down" });
    expect(guide({ x: 0.66, y: 0.95 }, start)).toMatchObject({ direction: "up" });
  });

  it("says 'a little' when close", () => {
    const g = guide({ x: 0.58, y: 0.75 }, start); // 0.07 left of center, 0.02 outside box+pad
    expect(g).toMatchObject({ onTarget: false, direction: "right" });
    const near = guide({ x: 0.6 - 0.013 - 0.001, y: 0.75 }, { ...start, w: 0.02, x: 0.6 });
    expect(near.onTarget).toBe(false);
    expect(near.small).toBe(true);
    expect(directionSentence(near, "Start")).toBe("Move a little right toward Start.");
  });

  it("builds the on-target sentence", () => {
    expect(directionSentence(guide({ x: 0.65, y: 0.75 }, start), "Start")).toBe("On target. Press Start.");
  });
});

describe("containLayout", () => {
  it("letterboxes a 16:9 frame inside a 4:3 box without cropping", () => {
    const l = containLayout(1280, 720, 400, 300);
    expect(l.drawW).toBe(400);
    expect(l.drawH).toBe(225);
    expect(l.offY).toBe(37.5);
    expect(l.point({ x: 0, y: 0 })).toEqual({ x: 0, y: 37.5 });
    expect(l.point({ x: 1, y: 1 })).toEqual({ x: 400, y: 262.5 });
    expect(l.box(start)).toEqual({ x: 240, y: 37.5 + 0.7 * 225, w: 40, h: 22.5 });
  });

  it("pillarboxes a tall frame", () => {
    const l = containLayout(720, 1280, 400, 300);
    expect(l.drawH).toBe(300);
    expect(l.offX).toBeCloseTo((400 - 168.75) / 2);
  });
});

describe("helpers", () => {
  it("contains", () => {
    expect(contains(start, { x: 0.6, y: 0.7 })).toBe(true);
    expect(contains(start, { x: 0.59, y: 0.7 })).toBe(false);
  });

  it("speaks single digits as buttons", () => {
    expect(spokenLabel("3")).toBe("button 3");
    expect(spokenLabel("Start")).toBe("Start");
  });

  it("frame difference", () => {
    const g = toGray(new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255]));
    expect(frameDifference(g, g)).toBe(0);
    expect(frameDifference(g, null)).toBe(Infinity);
    expect(frameDifference(g, new Uint8Array([0, 0]))).toBeCloseTo(g[0] / 2);
  });
});
