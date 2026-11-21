// Automated layout QA over EVERY frame of a composition.
// Renders with inputProps.qa=true (no screenshots), collects the QaProbe boxes and reports:
//   - anything outside the safe area (200px top/bottom) or cut off left/right
//   - captions extending below the top third (y > 640)
//   - captions overlapping an overlay, overlays overlapping each other
//   - clipped text
// plus static copy checks (caption word counts, "Rs" not "LKR", no "confirmed", only the allowed phone number).
// Usage: node scripts/qa-check.mjs [CatalystReel|CatalystReelSinhala]
import { bundle } from "@remotion/bundler";
import { openBrowser, renderFrames, selectComposition } from "@remotion/renderer";
import { mkdtempSync, readFileSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ALLOWED_NUMBER, PHONE_PATTERN } from "./phone-pattern.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const comp = process.argv[2] ?? "CatalystReel";
const lang = comp.includes("Sinhala") ? "si" : "en";
const SAFE_TOP = 200, SAFE_BOTTOM = 1720, TOP_THIRD = 640, W = 1080;
const VISIBLE = 0.6; // only judge elements that are (nearly) fully shown, not mid-fade

// ---------- static copy checks ----------
const problems = [];
const srcFiles = [];
const walk = (d) => readdirSync(d).forEach((f) => { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : /\.(tsx?|json)$/.test(f) && !f.includes("emoji") && srcFiles.push(p); });
walk(join(root, "src"));
const allSrc = srcFiles.map((p) => [p, readFileSync(p, "utf8")]);
for (const [p, s] of allSrc) {
  if (/LKR/.test(s)) problems.push(`copy: "LKR" found in ${p}`);
  if (/confirmed/i.test(s.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, ""))) problems.push(`copy: "confirmed" found in ${p}`);
  for (const m of s.matchAll(PHONE_PATTERN)) if (m[0] !== ALLOWED_NUMBER) problems.push(`copy: phone-like number "${m[0]}" in ${p}`);
}
const copySrc = readFileSync(join(root, "src/copy.ts"), "utf8");
const enBlock = copySrc.slice(copySrc.indexOf("en: {"), copySrc.indexOf("si: {"));
for (const m of enBlock.matchAll(/(c\d\w?): \[([^\]]+)\]/g)) {
  const words = m[2].replace(/["*,]/g, " ").replace(/\p{Extended_Pictographic}/gu, "").trim().split(/\s+/).filter(Boolean);
  if (words.length > 7) problems.push(`copy: caption ${m[1]} has ${words.length} words (max 7)`);
}

// ---------- per-frame layout checks ----------
const serveUrl = await bundle({ entryPoint: join(root, "src/index.ts"), publicDir: join(root, "public") });
const browserExecutable = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const browser = await openBrowser("chrome", { browserExecutable });
const inputProps = { lang, qa: true };
const composition = await selectComposition({ serveUrl, id: comp, inputProps, puppeteerInstance: browser, browserExecutable });
const frames = new Map();
await renderFrames({
  composition, serveUrl, inputProps, puppeteerInstance: browser, browserExecutable,
  imageFormat: "none", outputDir: mkdtempSync(join(tmpdir(), "qa-")), concurrency: 4,
  onStart: () => {}, onFrameUpdate: () => {},
  onBrowserLog: (log) => {
    if (!log.text.startsWith("QA ")) return;
    const d = JSON.parse(log.text.slice(3));
    frames.set(d.frame, d.items);
  },
});
await browser.close({ silent: true });

const hits = new Map(); // message -> frames[]
const hit = (msg, frame) => { if (!hits.has(msg)) hits.set(msg, []); hits.get(msg).push(frame); };
const inter = (a, b) => Math.max(0, Math.min(a.r, b.r) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.y, b.y));
for (const [frame, items] of [...frames].sort((a, b) => a[0] - b[0])) {
  const vis = items.filter((i) => i.op >= VISIBLE);
  for (const i of vis) {
    if (i.y < SAFE_TOP) hit(`${i.id} above safe area (top ${i.y}px)`, frame);
    if (i.b > SAFE_BOTTOM) hit(`${i.id} below safe area (bottom ${i.b}px)`, frame);
    if (i.x < 0 || i.r > W) hit(`${i.id} cut off horizontally (${i.x}..${i.r})`, frame);
    if (i.id === "caption" && i.b > TOP_THIRD) hit(`caption below top third (bottom ${i.b}px) "${i.text}"`, frame);
    if (i.clipped) hit(`${i.id} text clipped "${i.text}"`, frame);
  }
  const caps = vis.filter((i) => i.id === "caption");
  const ovs = vis.filter((i) => i.id.startsWith("overlay:"));
  for (const c of caps) for (const o of ovs) if (inter(c, o) > 0) hit(`caption "${c.text}" overlaps ${o.id}`, frame);
  for (let a = 0; a < ovs.length; a++)
    for (let b = a + 1; b < ovs.length; b++) {
      const A = ovs[a], B = ovs[b];
      if (A.id === B.id && A.id === "overlay:notification") continue; // stacked banners are spaced by design
      // pinned on purpose: badge on the phone frame / card corner / glowing phone the banners launch from
      const ok = [["overlay:phone", "overlay:language-badge"], ["overlay:reply-card", "overlay:unread-badge"], ["overlay:notification", "overlay:phone-badge"]];
      if (ok.some(([p, q]) => (A.id === p && B.id === q) || (A.id === q && B.id === p))) continue; // pinned on purpose
      const area = inter(A, B);
      if (area > 400) hit(`${A.id} overlaps ${B.id} (${area}px²)`, frame);
    }
  const end = vis.filter((i) => i.id.startsWith("end:")).sort((p, q) => p.y - q.y);
  for (let k = 1; k < end.length; k++) if (end[k].y < end[k - 1].b - 2 && end[k].id !== end[k - 1].id) hit(`${end[k - 1].id} overlaps ${end[k].id}`, frame);
}

const ranges = (fs) => {
  const out = []; let s = fs[0], p = fs[0];
  for (const f of fs.slice(1)) { if (f !== p + 1) { out.push(s === p ? `${s}` : `${s}-${p}`); s = f; } p = f; }
  out.push(s === p ? `${s}` : `${s}-${p}`);
  return out.join(", ");
};
console.log(`\nQA ${comp}: ${frames.size} frames measured`);
for (const p of problems) console.log("  ✗ " + p);
for (const [msg, fs] of hits) console.log(`  ✗ ${msg}  [frames ${ranges(fs)}]`);
if (!problems.length && !hits.size) console.log("  ✓ no safe-area, cut-off, overlap or copy problems");
