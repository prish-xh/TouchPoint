// Copies MediaPipe's WebAssembly files into public/ so hand tracking does not
// depend on a CDN at demo time. Runs automatically after `npm install`.
import { cpSync, existsSync, mkdirSync } from "node:fs";

const from = "node_modules/@mediapipe/tasks-vision/wasm";
const to = "public/mediapipe/wasm";
if (!existsSync(from)) {
  console.warn(`[copy-mediapipe-wasm] ${from} not found; skipping`);
} else {
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
  console.log(`[copy-mediapipe-wasm] copied to ${to}`);
}
