// Fonts are bundled from @fontsource (no network at render time).
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/dm-sans/800.css";
import "@fontsource/dm-sans/900.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/noto-sans-sinhala/500.css";
import "@fontsource/noto-sans-sinhala/700.css";
import "@fontsource/noto-sans-sinhala/800.css";
import { continueRender, delayRender } from "remotion";

const SINHALA_SAMPLE = "රෑ කෑම ඔබේ පාරිභෝගිකයෝ ඉන්නේ නෑ ඊළඟ කඩේට තත්පර ඇණවුම් සිංහල";

const handle = delayRender("Loading fonts");
const loads = [
  ...["500", "700", "800", "900"].map((w) => document.fonts.load(`${w} 64px "DM Sans"`, "Catalyst AaBb 0123")),
  ...["400", "500", "600", "700"].map((w) => document.fonts.load(`${w} 32px "Inter"`, "Kiyada? Rs 1,250")),
  ...["500", "700", "800"].map((w) => document.fonts.load(`${w} 64px "Noto Sans Sinhala"`, SINHALA_SAMPLE)),
];
Promise.all(loads)
  .then(() => document.fonts.ready)
  .then(() => continueRender(handle))
  .catch((err) => {
    console.error("Font loading failed", err);
    continueRender(handle);
  });
