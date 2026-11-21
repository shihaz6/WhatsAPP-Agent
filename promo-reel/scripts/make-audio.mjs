// Synthesizes the reel's whole soundtrack into public/audio/soundtrack.wav (30s, 44.1kHz stereo).
// This is the no-voiceover mix (used by the Sinhala reel and the original English render); the
// voiceover mixes are built by scripts/make-vo-mix.mjs.
// No samples are used (no licensing questions). Every sound is placed from src/timeline.json,
// so picture and sound share one clock. The generators live in scripts/synth.mjs.
//
//   0-3s    rapid phone buzzing on a wooden table + soft notification pings
//   3-6s    keyboard taps, send "pop", more buzzes as messages pile up
//   6-9s    clock ticking (tick/tock) over a low tension drone
//   9-12s   chat close/open, send/receive, whip whoosh, "ka-ching" on Shot 4
//   12s     big whoosh + soft impact for the logo
//   14-30s  gentle music (pad + kalimba), lifts at 20s (bass, beat, brighter arp), resolves at the end
//
// Usage: node scripts/make-audio.mjs

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createSynth, wavBuffer, writeLoudnormWav } from "./synth.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const T = JSON.parse(readFileSync(join(here, "..", "src", "timeline.json"), "utf8"));
const C = T.cues;
const SECONDS = T.duration;

const S = createSynth(SECONDS);
const { SR, N, TAU, rand, render, SFX, sfxL, sfxR, musL, musR } = S;
const { buzz, ping, tap, pop, tick, whoosh, kaching, chime, roomTone } = S;

// ---- place SFX ----
roomTone(0, 12.4, 0.5);

// 0-3s: rapid buzzing + pings on every banner, then the buzzing keeps coming
C.notifications.forEach((t, i) => {
  buzz(t - 0.02, 0.36, 1.0, -0.3);
  ping(t, 0.75, i % 2 ? [90, 97] : [88, 95], -0.15);
});
[2.24, 2.62].forEach((t) => buzz(t, 0.3, 0.8, -0.3));

// 3-6s: typing + buzzing
{
  const [a, b] = C.s2Typing;
  let t = a;
  while (t < b) { tap(t, 1.25); t += 0.068 + Math.abs(rand()) * 0.05; }
}
pop(C.s2Send, 0.9, true, 0.25);
C.s2Arrivals.forEach((t) => { buzz(t, 0.26, 0.8, -0.35); ping(t + 0.02, 0.45, [91, 96], 0.2); });

// 6-9s: clock ticking over a low tension drone
for (let k = 0; k < 6; k++) tick(C.tickStart + k * 0.5, k % 2 === 1, 1.6);
render(SFX, 6.0, 4.6, (t) => {
  const env = Math.min(1, t / 1.2) * Math.min(1, (4.6 - t) / 0.8);
  return (Math.sin(TAU * 55 * t) + 0.5 * Math.sin(TAU * 82.4 * t + Math.sin(TAU * 0.5 * t))) * env * 0.06;
}, 1);

// 9-12s
whoosh(C.chatClose - 0.04, 0.28, 0.32, { from: 1800, to: 600, pan: -0.3 });
pop(C.chatOpen + 0.03, 0.5, true, 0.3);
pop(C.otherShopSend, 0.8, true, 0.3);
ping(C.otherShopReply, 0.55, [93, 98], 0.3);
whoosh(C.whip - 0.14, 0.3, 0.75, { from: 400, to: 4200 });
kaching(C.kaching, 1.0);

// 12s logo: big whoosh + impact, then a shimmering sting that swells into the music at 14s
whoosh(C.logoFlash - 0.42, 0.75, 1.0, { from: 250, to: 5200, impact: 0.85 });
S.logoSting(SFX, C.logoFlash, C.musicStart);

// 14-20s chat: phone swoosh in, message blips
whoosh(C.phoneIn - 0.08, 0.4, 0.4, { from: 600, to: 2600, pan: -0.3 });
C.chatMsgs.forEach((t, i) => pop(t, i % 2 ? 0.75 : 0.6, i % 2 === 1, i % 2 ? -0.1 : -0.35));
pop(C.badge, 0.35, true, -0.1);

// 20s: banner chime
chime(C.banner, 1.0);

// 25s end card: wipe whoosh, button pop
whoosh(C.endCard - 0.3, 0.45, 0.55, { from: 300, to: 3000 });
pop(C.button, 0.8, true, 0);
ping(C.button + 0.05, 0.4, [96, 100], 0);

// ---- MUSIC (14-30s) ----
S.warmMusic(C, SECONDS);

// ---- reverb + mix ----
S.reverb(musL, musR, 0.38);
S.reverb(sfxL, sfxR, 0.12, [23.1, 27.7, 31.3, 35.9]);

const L = new Float32Array(N), R = new Float32Array(N);
for (let i = 0; i < N; i++) {
  L[i] = sfxL[i] * 1.0 + musL[i] * 1.15;
  R[i] = sfxR[i] * 1.0 + musR[i] * 1.15;
}
// normalize, then a gentle tanh limiter for loudness (limited output kept in double precision)
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const pre = 1.25 / peak;
const lim = (x) => Math.tanh(x * pre) / Math.tanh(1.25) * 0.93;
const outL = Float64Array.from(L, lim), outR = Float64Array.from(R, lim);

const out = join(here, "..", "public", "audio", "soundtrack.wav");
const stats = writeLoudnormWav(wavBuffer(outL, outR, SR), out);
console.log(`Wrote ${out} (${SECONDS}s, mix measured ${stats.input_i} LUFS, normalised to -14 LUFS / -1.5 dBTP)`);
