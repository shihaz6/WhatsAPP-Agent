// Renders preview stills of both versions into out/stills (bundles once, then renders each frame).
// Usage: node scripts/stills.mjs [frame,frame,...] [Composition-Id,...]

import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const frames = (process.argv[2] ?? "130,212,262,345,450,540,640,760,900").split(",").map(Number);
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const browserExecutable = process.platform === "win32" && existsSync(EDGE) ? EDGE : undefined;

const serveUrl = await bundle({ entryPoint: join(root, "src", "index.ts") });
mkdirSync(join(root, "out", "stills"), { recursive: true });
const ids = process.argv[3] ? process.argv[3].split(",") : ["Teaser-Landscape", "Teaser-Portrait", "Teaser-Feed"];
for (const id of ids) {
  const composition = await selectComposition({ serveUrl, id, browserExecutable });
  for (const frame of frames) {
    const output = join(root, "out", "stills", `${id}-${frame}.png`);
    await renderStill({ composition, serveUrl, frame, output, browserExecutable, scale: 0.5 });
    console.log(output);
  }
}
