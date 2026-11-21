// Builds the English voiceover cuts of the reel:
//   out/catalyst-reel-en-vo-sfx.mp4     voiceover + music + sound effects
//   out/catalyst-reel-en-vo-nosfx.mp4   voiceover + music only
// The picture is taken unchanged from out/catalyst-reel.mp4 (npm run render); only the audio is replaced.
//
// Voiceover: public/audio/voiceover-en.wav, cut at its own pauses and re-placed on the picture's beats
// (src/timeline.json -> voiceover.clips). No time-stretching, so the voice stays natural.
//
// Sound design for a voiced cut (vs. the original no-VO soundtrack in make-audio.mjs):
//   - The voice leads. Music and SFX are ducked under it (look-ahead side-chain).
//   - A tension underscore now runs from 0-12s (dark pad + pulse on the clock's grid, Am -> F -> G),
//     resolving through the logo sting (C) into the warm 14-30s music. It used to be SFX-only there,
//     which would leave the no-SFX cut bare. The 6-9s drone and the logo sting moved from SFX to music.
//   - SFX are thinned to the ones that tell the story and kept out of the words' way:
//       kept:    phone buzzes (fewer pings), typing + send pop, clock ticks in the VO-free 6-8.6s gap,
//                whip, ka-ching (the VO's "...next shop" ends right before it), logo whoosh + impact,
//                phone swoosh, chat blips, a softer two-note banner chime, end wipe, button pop
//       dropped: 3 arrival pings, chat close whoosh / open pop / send pop at 9.3-9.9 (under "Customers
//                don't wait"), the other shop's reply ping, the language-badge pop, the button's ping
//
// Usage: node scripts/make-vo-mix.mjs   (needs out/catalyst-reel.mp4; run `npm run render` first)

import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createSynth, wavBuffer } from "./synth.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const T = JSON.parse(readFileSync(join(root, "src", "timeline.json"), "utf8"));
const C = T.cues;
const SECONDS = T.duration;
const VIDEO_IN = join(root, "out", "catalyst-reel.mp4");
const STEMS = join(root, "public", "audio", "vo");
mkdirSync(STEMS, { recursive: true });

const S = createSynth(SECONDS);
const { SR, N, TAU, rand, midi, biquad, render, SFX, MUS, sfxL, sfxR, musL, musR } = S;
const { buzz, ping, tap, pop, tick, whoosh, kaching, chime, roomTone } = S;

function ffmpeg(args, opts = {}) {
  const r = spawnSync("ffmpeg", ["-hide_banner", ...args], { maxBuffer: 1 << 30, ...opts });
  if (r.status !== 0) throw new Error(String(r.stderr));
  return r;
}

/** Integrated loudness (LUFS) and true peak (dBTP) of a stereo float pair. */
function measure(L, R) {
  const tmp = join(STEMS, "_measure.wav");
  writeFileSync(tmp, wavBuffer(L, R, SR));
  const r = ffmpeg(["-i", tmp, "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8" });
  unlinkSync(tmp);
  const sum = r.stderr.slice(r.stderr.lastIndexOf("Summary:"));
  return { I: +/I:\s+(-?[\d.]+) LUFS/.exec(sum)[1], TP: +/Peak:\s+(-?[\d.inf]+) dBFS/.exec(sum)[1] };
}
const dbToGain = (db) => 10 ** (db / 20);

// ---------------------------------------------------------------- voiceover track
const vo = new Float32Array(N);
{
  const src = join(root, T.voiceover.file);
  const pcm = ffmpeg(["-loglevel", "error", "-i", src, "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"]).stdout;
  const raw = new Float32Array(pcm.buffer, pcm.byteOffset, pcm.length / 4);
  const fade = Math.round(0.008 * SR);
  for (const [a, b, at] of T.voiceover.clips) {
    const s0 = Math.round(a * SR), s1 = Math.min(raw.length, Math.round(b * SR)), d0 = Math.round(at * SR);
    const len = s1 - s0;
    for (let j = 0; j < len; j++) {
      const g = Math.min(1, j / fade, (len - 1 - j) / fade);
      const i = d0 + j;
      if (i >= 0 && i < N) vo[i] += raw[s0 + j] * g;
    }
  }
  // clean the low end (TTS rumble / plosives) so it doesn't fight the music's bass
  const hp1 = biquad("hp", 85), hp2 = biquad("hp", 85);
  for (let i = 0; i < N; i++) vo[i] = hp2(hp1(vo[i]));
}

// Side-chain key from the VO: peak follower (fast attack, slow release) with look-ahead, so the
// duck has started by the time the first syllable lands. 0 = no voice, 1 = voice.
const key = new Float32Array(N);
{
  const look = Math.round(0.06 * SR);
  const att = Math.exp(-1 / (0.008 * SR)), rel = Math.exp(-1 / (0.28 * SR));
  let env = 0;
  const lin = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const x = Math.abs(vo[i]);
    env = x > env ? att * env + (1 - att) * x : rel * env + (1 - rel) * x;
    lin[i] = env;
  }
  const sm = Math.exp(-1 / (0.05 * SR));
  let k = 0;
  for (let i = 0; i < N; i++) {
    const e = lin[Math.min(N - 1, i + look)];
    const db = 20 * Math.log10(e + 1e-9);
    const target = Math.max(0, Math.min(1, (db + 52) / 16)); // -52 dBFS -> 0 ... -36 dBFS -> 1
    k = sm * k + (1 - sm) * target;
    key[i] = k;
  }
}

// ---------------------------------------------------------------- music
// 0-11.6s tension underscore. Pulse sits on the clock-tick grid (beats at 0.15 + 0.5k), so the
// SFX ticks at 6-9s land on it. Harmony climbs Am -> F (9s) -> G (10.5s) toward the logo's C.
{
  const UEND = C.logoFlash - 0.4; // clean stop so the logo hit lands in a breath of silence
  const PH = C.tickStart % 0.5;
  const sections = [
    { from: 0, to: 9.0, notes: [45, 52, 57, 60, 64], bass: 33 },     // Am
    { from: 9.0, to: 10.5, notes: [41, 53, 57, 60, 64], bass: 29 },  // Fmaj7
    { from: 10.5, to: UEND, notes: [43, 55, 59, 62, 67], bass: 31 }, // G
  ];
  const level = (t) => {
    // swell: cold open 0.55, pile-up 0.75, the wait 0.95, the switch 1.0; quick fade at the end
    const k = t < 3 ? 0.55 + 0.1 * (t / 3) : t < 6 ? 0.65 + 0.1 * ((t - 3) / 3) : t < 9 ? 0.75 + 0.2 * ((t - 6) / 3) : 1;
    return k * Math.min(1, t / 1.2) * Math.min(1, Math.max(0, (UEND - t) / 0.25));
  };
  // pad (detuned pair per note, brightness rises with the tension)
  sections.forEach(({ from, to, notes }) => {
    const len = to - from + 0.35;
    notes.forEach((n, k) => {
      const fr = midi(n), pan = (k / (notes.length - 1)) * 0.9 - 0.45;
      render(MUS, from, len, (t) => {
        const abs = from + t;
        const xf = Math.min(1, t / 0.3) * Math.min(1, Math.max(0, (len - t) / 0.35));
        const bright = 0.08 + 0.22 * Math.min(1, abs / 10);
        let v = 0;
        for (const d of [0.996, 1.004]) {
          const ph = TAU * fr * d * t;
          v += Math.sin(ph) + bright * Math.sin(2 * ph) + bright * 0.4 * Math.sin(3 * ph);
        }
        return v * xf * 0.03 * level(abs);
      }, 1, pan);
    });
  });
  // high "unease" shimmer during the wait (B4 over Am, i.e. an add9 that never resolves)
  render(MUS, 6.0, 3.2, (t) => {
    const env = Math.min(1, t / 1.5) * Math.min(1, (3.2 - t) / 0.6);
    return Math.sin(TAU * midi(71) * t + 0.4 * Math.sin(TAU * 5 * t)) * env * 0.02;
  }, 1, 0.3);
  // pulse: half-notes 0-3s, quarters 3-9s, eighths 9s+ (urgency into the switch)
  for (let t0 = PH; t0 < UEND - 0.05; ) {
    const sec = sections.find((s) => t0 >= s.from && t0 < s.to) ?? sections[sections.length - 1];
    const fr = midi(sec.bass);
    const accent = t0 >= 6 && t0 < 9 ? 1.15 : 1;
    let ph = 0;
    render(MUS, t0, 0.32, (t) => {
      const f = fr * (1 + 0.6 * Math.exp(-t * 40));
      ph += (TAU * f) / SR;
      return (Math.sin(ph) + 0.35 * Math.sin(2 * ph)) * Math.min(1, t / 0.004) * Math.exp(-t * 11) * 0.2 * accent * level(t0 + t);
    });
    t0 += t0 < 3 ? 1.0 : t0 < 9 ? 0.5 : 0.25;
  }
}
S.logoSting(MUS, C.logoFlash, C.musicStart);
S.warmMusic(C, SECONDS);

// ---------------------------------------------------------------- SFX (curated for the voice)
roomTone(0, 12.4, 0.5);

// 0-3s: the phone won't stop. Every banner buzzes; only two of them ping (pings sit in the voice's range).
C.notifications.forEach((t, i) => {
  buzz(t - 0.02, 0.36, 0.85, -0.3);
  if (i === 0 || i === 3) ping(t, 0.5, i % 2 ? [90, 97] : [88, 95], -0.2);
});
[2.24, 2.62].forEach((t) => buzz(t, 0.3, 0.75, -0.3));

// 3-6s: "You reply to one" - typing and the send pop. "Three more pop up" - arrival buzzes only.
{
  const [a, b] = C.s2Typing;
  let t = a;
  while (t < b) { tap(t, 0.9); t += 0.068 + Math.abs(rand()) * 0.05; }
}
pop(C.s2Send, 0.8, true, 0.25);
C.s2Arrivals.forEach((t) => buzz(t, 0.26, 0.7, -0.35));

// 6-9s: no voice here, so the clock is the hero. Five ticks; the sixth would land on "Customers".
for (let k = 0; k < 5; k++) tick(C.tickStart + k * 0.5, k % 2 === 1, 1.6);

// 9-12s: keep the line clean, then punctuate it. Whip under "the next", ka-ching right after "shop".
whoosh(C.whip - 0.14, 0.3, 0.55, { from: 400, to: 4200 });
kaching(C.kaching, 0.85);

// 12s logo: whoosh + impact; "Now," follows the hit.
whoosh(C.logoFlash - 0.42, 0.75, 0.8, { from: 250, to: 5200, impact: 0.7 });

// 14-20s chat: phone swoosh in, one blip per message (incoming down, Catalyst's replies up).
whoosh(C.phoneIn - 0.08, 0.4, 0.35, { from: 600, to: 2600, pan: -0.3 });
C.chatMsgs.forEach((t, i) => pop(t, i % 2 ? 0.7 : 0.5, i % 2 === 1, i % 2 ? -0.1 : -0.35));

// 20.9s morning banner: a softer two-note chime under "...orders".
chime(C.banner, 0.6, [[88, 0], [95, 0.11]]);

// 25s end card: wipe whoosh, button pop just before "Comment BOT".
whoosh(C.endCard - 0.3, 0.45, 0.4, { from: 300, to: 3000 });
pop(C.button, 0.75, true, 0);

// ---------------------------------------------------------------- reverb, levels, ducking
S.reverb(musL, musR, 0.38);
S.reverb(sfxL, sfxR, 0.12, [23.1, 27.7, 31.3, 35.9]);

// Stem levels (integrated LUFS before the final loudness pass). The voice sits on top; music is a bed
// ~6 LU under it and ducks a further 10 dB when the voice speaks; SFX duck 7 dB.
const LEVEL = { vo: -16, music: -22, sfx: -21 };
const DUCK_DB = { music: 10, sfx: 7 };

const fit = (L, R, target) => {
  const { I } = measure(L, R);
  const g = dbToGain(target - I);
  for (let i = 0; i < N; i++) { L[i] *= g; R[i] *= g; }
  return I;
};
const voR = Float32Array.from(vo);
fit(vo, voR, LEVEL.vo);
fit(musL, musR, LEVEL.music);
fit(sfxL, sfxR, LEVEL.sfx);

const duckM = new Float32Array(N), duckS = new Float32Array(N);
for (let i = 0; i < N; i++) {
  duckM[i] = dbToGain(-DUCK_DB.music * key[i]);
  duckS[i] = dbToGain(-DUCK_DB.sfx * key[i]);
}

// stems for inspection / re-mixing elsewhere
writeFileSync(join(STEMS, "vo.wav"), wavBuffer(vo, voR, SR));
writeFileSync(join(STEMS, "music.wav"), wavBuffer(musL, musR, SR));
writeFileSync(join(STEMS, "sfx.wav"), wavBuffer(sfxL, sfxR, SR));

// ---------------------------------------------------------------- mixes + mux
function buildMix(withSfx) {
  const L = new Float32Array(N), R = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    L[i] = vo[i] + musL[i] * duckM[i] + (withSfx ? sfxL[i] * duckS[i] : 0);
    R[i] = voR[i] + musR[i] * duckM[i] + (withSfx ? sfxR[i] * duckS[i] : 0);
  }
  return [L, R];
}

/** Gain to -14 LUFS, then a look-ahead brickwall at -1.5 dBTP (ffmpeg alimiter, 4x oversampled check). */
function master(L, R, out) {
  const raw = out.replace(/\.wav$/, "-raw.wav");
  writeFileSync(raw, wavBuffer(L, R, SR));
  let gainDb = -14 - measure(L, R).I;
  for (let pass = 0; pass < 3; pass++) {
    ffmpeg(["-loglevel", "error", "-y", "-i", raw, "-af",
      `volume=${gainDb.toFixed(3)}dB,aresample=192000,alimiter=limit=-1.8dB:attack=3:release=60:level=disabled,aresample=48000`,
      "-c:a", "pcm_s16le", out]);
    const r = ffmpeg(["-i", out, "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8" });
    const sum = r.stderr.slice(r.stderr.lastIndexOf("Summary:"));
    const I = +/I:\s+(-?[\d.]+) LUFS/.exec(sum)[1], TP = +/Peak:\s+(-?[\d.]+) dBFS/.exec(sum)[1];
    if (Math.abs(I + 14) <= 0.2 || pass === 2) { unlinkSync(raw); return { I, TP }; }
    gainDb += -14 - I; // the limiter shaved a little loudness; nudge and redo
  }
}

if (!existsSync(VIDEO_IN)) throw new Error(`Missing ${VIDEO_IN} - run \`npm run render\` first.`);
for (const [name, withSfx] of [["sfx", true], ["nosfx", false]]) {
  const wav = join(STEMS, `mix-en-vo-${name}.wav`);
  const [L, R] = buildMix(withSfx);
  const { I, TP } = master(L, R, wav);
  const mp4 = join(root, "out", `catalyst-reel-en-vo-${name}.mp4`);
  ffmpeg(["-loglevel", "error", "-y", "-i", VIDEO_IN, "-i", wav,
    "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "320k", "-ar", "48000",
    "-movflags", "+faststart", mp4]);
  console.log(`Wrote ${mp4}  (${I.toFixed(1)} LUFS, ${TP.toFixed(1)} dBTP)`);
}
