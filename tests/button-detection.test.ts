import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { preparePanelImage, normalizeDetections } from "@/lib/server/button-detection";
const controls = [{ id: "digit_3", label: "3" }, { id: "digit_0", label: "0" }];
const box = (mention = "button labeled 3", x = 100, y = 200, right = 200, bottom = 300) => ({ mention, point_box: { top_left: { x, y }, bottom_right: { x: right, y: bottom } } });
const result = (...detections: ReturnType<typeof box>[]) => ({ finish_reason: "complete", detections });
describe("native pixel detection", () => {
  it("uses actual image dimensions rather than treating pixels as a 1000-grid", () => {
    expect(normalizeDetections(result(box()), controls, 500, 1000)).toEqual([{ controlId: "digit_3", label: "3", x: 0.2, y: 0.2, w: 0.2, h: 0.1 }]);
  });
  it.each([
    box("unknown"), box("button labeled 3", 400, 200, 600, 300), box("button labeled 3", 200, 200, 100, 300),
  ])("omits unknown or invalid boxes", (d) => {
    expect(normalizeDetections(result(d), controls, 500, 1000)).toEqual([]);
  });
  it("rejects duplicates rather than arbitrarily picking one", () => {
    expect(normalizeDetections(result(box(), box()), controls, 500, 1000)).toEqual([]);
  });
  it("rejects labels pointing at the same physical area", () => {
    expect(normalizeDetections(result(box(), box("button labeled 0")), controls, 500, 1000)).toEqual([]);
  });
  it("rejects incomplete results", () => {
    expect(() => normalizeDetections({ ...result(box()), finish_reason: "length" }, controls, 500, 1000)).toThrow();
  });
  it("rotates EXIF-tagged images, bounds resolution, and strips metadata", async () => {
    const bytes = await sharp({ create: { width: 2400, height: 1200, channels: 3, background: "white" } }).jpeg().withMetadata({ orientation: 6 }).toBuffer();
    const prepared = await preparePanelImage(`data:image/jpeg;base64,${bytes.toString("base64")}`);
    expect(prepared).toMatchObject({ width: 800, height: 1600 });
    const meta = await sharp(Buffer.from(prepared.dataUrl.split(",")[1], "base64")).metadata();
    expect(meta.orientation).toBeUndefined(); expect(meta.exif).toBeUndefined();
  });
  it("rejects fake image data before provider spending", async () => {
    await expect(preparePanelImage("data:image/jpeg;base64,aGVsbG8=")).rejects.toMatchObject({ code: "INVALID_IMAGE" });
  });
});
