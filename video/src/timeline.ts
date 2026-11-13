// Scene timing (30 fps). Scenes overlap by FADE frames so they cross-dissolve.
export const FPS = 30;
export const FADE = 14;

export const SCENES = {
  intro: { from: 0, duration: 120 },          // 0.0s  logo + name
  overview: { from: 106, duration: 214 },     // 3.5s  the day at a glance
  chat: { from: 306, duration: 330 },         // 10.2s message in, bot replies in Singlish
  takeover: { from: 622, duration: 200 },     // 20.7s teacher steps in
  payments: { from: 808, duration: 170 },     // 26.9s approve a slip
  outro: { from: 964, duration: 116 },        // 32.1s sign-off
} as const;

export const TOTAL = SCENES.outro.from + SCENES.outro.duration; // 1080 frames = 36s

// App frame size: the dashboard is laid out at a normal laptop size, then scaled into the video.
export const APP_W = 1440;
export const APP_H = 860;
