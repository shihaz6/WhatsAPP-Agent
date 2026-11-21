// Extracts the few Noto emoji (Apache-2.0, via @iconify-json/noto) the reel uses into src/ui/emoji.json.
// Emoji are drawn as inline SVG: headless Edge does not paint COLRv1 colour-emoji fonts.
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const set = JSON.parse(readFileSync(require.resolve("@iconify-json/noto/icons.json"), "utf8"));
const MAP = {
  "📱": "mobile-phone",
  "😊": "smiling-face-with-smiling-eyes",
  "☕": "hot-beverage",
  "👇": "backhand-index-pointing-down",
  "😳": "flushed-face",
  "🙏": "folded-hands",
  "🛒": "shopping-cart",
  "📩": "envelope-with-arrow",
  "👋": "waving-hand",
  "⚡": "high-voltage",
};
const out = {};
for (const [ch, name] of Object.entries(MAP)) {
  const icon = set.icons[name];
  if (!icon) throw new Error(`missing ${name}`);
  // make gradient/clip ids unique per emoji
  out[ch] = { w: icon.width ?? set.width, h: icon.height ?? set.height, body: icon.body.replace(/IconifyId/g, `e${name.replace(/-/g, "")}`) };
}
writeFileSync(new URL("../src/ui/emoji.json", import.meta.url), JSON.stringify(out));
console.log("emoji:", Object.keys(out).join(" "));
