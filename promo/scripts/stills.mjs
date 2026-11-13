// Renders preview stills of both versions into out/stills (bundles once, then renders each frame).
// Usage: node scripts/stills.mjs [frame,frame,...] [Composition-Id,...]

import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const frames = (process.argv[2] ?? "60,100,180,240,300,360,420,490,580,670,760,850,950,1040").split(",").map(Number);
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const browserExecutable = process.platform === "win32" && existsSync(EDGE) ? EDGE : undefined;

const serveUrl = await bundle({ entryPoint: join(root, "src", "index.ts") });
mkdirSync(join(root, "out", "stills"), { recursive: true });
const ids = process.argv[3] ? process.argv[3].split(",") : ["Promo-Landscape", "Promo-Portrait"];
for (const id of ids) {
  const composition = await selectComposition({ serveUrl, id, browserExecutable });
  for (const frame of frames) {
    const output = join(root, "out", "stills", `${id}-${frame}.png`);
    await renderStill({ composition, serveUrl, frame, output, browserExecutable, scale: 0.5 });
    console.log(output);
  }
}
