import timeline from "./timeline.json";

export const FPS = timeline.fps;
export const W = 1080;
export const H = 1920;
export const DURATION = timeline.duration * FPS;

/** seconds -> frames */
export const f = (s: number) => Math.round(s * FPS);
export const SEC = timeline.sections;
export const CUE = timeline.cues;

// Brand
export const CHARCOAL = "#1A1A1A";
export const ORANGE = "#FF8A4C";
export const ORANGE_DEEP = "#E8743B";
export const WHITE = "#FFFFFF";

// Everything stays inside this box (200px clear at the top and bottom).
export const SAFE_TOP = 200;
export const SAFE_BOTTOM = H - 200;

// Emoji are drawn as inline Noto SVGs (see ui/Emoji.tsx), not from a font.
export const FONT_BRAND = `"DM Sans", "Noto Sans Sinhala", sans-serif`;
export const FONT_UI = `"Inter", "Noto Sans Sinhala", sans-serif`;

// WhatsApp (iOS, light) palette
export const WA = {
  green: "#25D366",
  teal: "#008069",
  outBubble: "#D9FDD3",
  inBubble: "#FFFFFF",
  text: "#111B21",
  meta: "#667781",
  tick: "#53BDEB",
  wallpaper: "#EFE7DE",
  header: "#F6F5F3",
  blue: "#007AFF",
};

export type Lang = "en" | "si";
