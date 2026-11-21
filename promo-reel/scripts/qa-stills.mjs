// Renders QA stills (PNG) from one bundle: a frame from every section and the middle of every transition.
// Usage: node scripts/qa-stills.mjs [composition=CatalystReel] [outDir=out/qa] [frames=comma,list] [--safe]
import { bundle } from "@remotion/bundler";
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const safe = process.argv.includes("--safe");
const comp = args[0] ?? "CatalystReel";
const outDir = join(root, args[1] ?? "out/qa");

// label -> frame
const DEFAULT = {
  "s1-notifications_1.9s": 57,
  "t1-mid_3.0s": 90,
  "s2-chat_4.6s": 138,
  "t2-mid-split-in_6.0s": 180,
  "split_7.8s": 234,
  "t3-mid-split-out_9.0s": 270,
  "s3-new-chat_10.3s": 309,
  "t4-mid-whip_10.5s": 315,
  "s4-kaching_11.2s": 336,
  "t5-mid-flash_12.0s": 360,
  "logo_12.9s": 387,
  "t6-mid-logo-to-phone_14.0s": 424,
  "chat_17.0s": 512,
  "chat-final_19.5s": 585,
  "t7-mid-morning_20.0s": 600,
  "s6-banner_22.5s": 675,
  "t8-mid-endcard_25.0s": 750,
  "end_28.5s": 855,
};
const frames = process.argv.find((a) => a.startsWith("--frames="));
const list = frames
  ? Object.fromEntries(frames.slice(9).split(",").map((n) => [`f${n}`, Number(n)]))
  : DEFAULT;

mkdirSync(outDir, { recursive: true });
const serveUrl = await bundle({ entryPoint: join(root, "src/index.ts"), publicDir: join(root, "public") });
const browserExecutable = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const browser = await openBrowser("chrome", { browserExecutable });
const inputProps = safe ? { showSafeArea: true, lang: comp.includes("Sinhala") ? "si" : "en" } : {};
const composition = await selectComposition({ serveUrl, id: comp, inputProps, puppeteerInstance: browser, browserExecutable });
for (const [label, frame] of Object.entries(list)) {
  const output = join(outDir, `${String(frame).padStart(3, "0")}_${label}.png`);
  await renderStill({ composition, serveUrl, frame, output, inputProps, puppeteerInstance: browser, browserExecutable, imageFormat: "png" });
  console.log("still", frame, label);
}
await browser.close({ silent: true });
