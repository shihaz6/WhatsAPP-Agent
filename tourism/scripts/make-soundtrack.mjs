// Generates public/soundtrack.wav for the tourism promo, synced to src/cues.json. Fully synthesized, no samples.
// 120 BPM at 30 fps: one beat = 15 frames, every scene boundary sits on the beat grid.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const cues = JSON.parse(readFileSync(join(here, "..", "src", "cues.json"), "utf8"));
const S = cues.scenes;
const SR = 44100;
const FPS = cues.fps;
const SECONDS = cues.total / FPS;
const N = Math.ceil(SR * SECONDS);
const L = new Float32Array(N);
const R = new Float32Array(N);

const at = (frame) => frame / FPS;
const midi = (m) => 440 * 2 ** ((m - 69) / 12);
let seed = 11;
const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1;
function put(i, v, pan) { if (i >= 0 && i < N) { L[i] += v * (1 - pan); R[i] += v * (1 + pan); } }

const perc = (a, d) => (t) => Math.min(1, t / a) * Math.exp(-t * d);
const swell = (a, r, dur) => (t) => Math.max(0, Math.min(1, t / a, (dur - t) / r));
const SOFT = [[1, 1], [2, 0.3], [3, 0.12]];
const BELL = [[1, 1], [2.76, 0.22], [5.4, 0.06]];
const MARIMBA = [[1, 1], [3.9, 0.32], [9.2, 0.07]];
const PLUCK = [[1, 1], [2, 0.45], [3, 0.2], [4, 0.08]];
const SAW = [[1, 1], [2, 0.5], [3, 0.33], [4, 0.25], [5, 0.2], [6, 0.16]];

function voice({ t0, dur, freq = 440, glide, amp, pan = 0, partials = [[1, 1]], env, detune = 0 }) {
  const s0 = Math.floor(t0 * SR), n = Math.floor(dur * SR);
  let ph = 0, ph2 = 0;
  for (let j = 0; j < n; j++) {
    const t = j / SR;
    const fr = glide ? glide(t) : freq;
    ph += (2 * Math.PI * fr) / SR;
    ph2 += (2 * Math.PI * fr * (1 + detune)) / SR;
    let v = 0;
    for (const [m, a] of partials) v += a * (detune ? 0.5 * (Math.sin(ph * m) + Math.sin(ph2 * m)) : Math.sin(ph * m));
    put(s0 + j, v * amp * env(t), pan);
  }
}
function noise({ t0, dur, amp, pan = 0, env, cutoff = () => 9000, hp = 0 }) {
  const s0 = Math.floor(t0 * SR), n = Math.floor(dur * SR);
  const b = hp ? 1 - Math.exp((-2 * Math.PI * hp) / SR) : 0;
  let lp = 0, low = 0;
  for (let j = 0; j < n; j++) {
    const t = j / SR;
    const a = 1 - Math.exp((-2 * Math.PI * cutoff(t)) / SR);
    lp += a * (rand() - lp);
    let v = lp;
    if (hp) { low += b * (v - low); v -= low; }
    put(s0 + j, v * amp * env(t), pan);
  }
}
const chord = (notes, opts) => notes.forEach((m, k) => voice({ ...opts, freq: midi(m), pan: (k / Math.max(1, notes.length - 1) - 0.5) * 0.8 }));

// ---------- Instruments ----------
const BEAT = cues.beat, BAR = BEAT * 4;
const beatSec = BEAT / FPS;
const mar = (frame, m, amp = 0.06, pan = 0, decay = 7) => voice({ t0: at(frame), dur: 1.2, freq: midi(m), amp, pan, partials: MARIMBA, env: perc(0.001, decay) });
const bell = (frame, m, amp = 0.05, pan = 0, decay = 5) => voice({ t0: at(frame), dur: 1.6, freq: midi(m), amp, pan, partials: BELL, env: perc(0.001, decay) });
const kick = (frame, amp = 0.4) => voice({ t0: at(frame), dur: 0.35, glide: (t) => 50 + 110 * Math.exp(-t * 40), amp, env: perc(0.002, 11) });
const clap = (frame, amp = 0.3) => {
  for (const [dt, a] of [[0, 0.7], [0.011, 0.8], [0.023, 1]]) noise({ t0: at(frame) + dt, dur: 0.06, amp: amp * a, env: perc(0.0005, 60), cutoff: () => 3800, hp: 900 });
  noise({ t0: at(frame) + 0.03, dur: 0.25, amp: amp * 0.45, env: perc(0.001, 14), cutoff: () => 3200, hp: 1200 });
};
const hat = (frame, amp = 0.05, pan = 0.25, open = false) => noise({ t0: at(frame), dur: open ? 0.25 : 0.06, amp, pan, env: (t) => Math.min(1, t / 0.002) * Math.exp(-t * (open ? 14 : 70)), cutoff: () => 14000, hp: 7500 });
const snap = (frame, amp = 0.2) => { noise({ t0: at(frame), dur: 0.05, amp, env: perc(0.0003, 90), cutoff: () => 9000, hp: 2500 }); voice({ t0: at(frame), dur: 0.03, freq: 2100, amp: amp * 0.3, env: perc(0.0003, 120) }); };
const tick = (frame, amp = 0.12, hi = true) => voice({ t0: at(frame), dur: 0.04, freq: hi ? 3200 : 2400, amp, partials: [[1, 1], [2.3, 0.4]], env: perc(0.0002, 150) });
const keyClick = (frame, amp = 0.12) => { noise({ t0: at(frame), dur: 0.03, amp, env: perc(0.0003, 140), cutoff: () => 7000, hp: 1800 }); voice({ t0: at(frame), dur: 0.02, freq: 1700, amp: amp * 0.25, env: perc(0.0002, 200) }); };
const popIn = (frame, m = 81, amp = 0.07, pan = 0) => { mar(frame, m, amp, pan, 11); mar(frame + 2.5, m + 5, amp * 0.8, pan, 11); };
const ping = (frame, amp = 0.07, pan = 0) => { bell(frame, 88, amp, pan, 9); bell(frame + 2.2, 93, amp * 0.9, pan, 7); };
const swish = (frame, amp = 0.16, pan = 0) => noise({ t0: at(frame), dur: 0.3, amp, pan, env: (t) => Math.sin((Math.PI * t) / 0.3) ** 2, cutoff: (t) => 2000 + 9000 * (t / 0.3), hp: 1200 });
const boom = (frame, amp = 0.5) => { voice({ t0: at(frame), dur: 2.2, glide: (t) => 38 + 40 * Math.exp(-t * 8), amp, partials: SOFT, env: perc(0.004, 1.8) }); noise({ t0: at(frame), dur: 1.2, amp: 0.12, env: perc(0.002, 3), cutoff: () => 900 }); };
const riser = (f0, f1, amp = 0.22) => { const t0 = at(f0), d = at(f1) - t0; noise({ t0, dur: d, amp, env: (t) => (t / d) ** 2.6, cutoff: (t) => 600 + 10000 * (t / d) ** 2, hp: 500 }); voice({ t0, dur: d, glide: (t) => 110 * 2 ** (3 * t / d), amp: amp * 0.18, partials: SAW, env: (t) => (t / d) ** 2 }); };
const crash = (frame, amp = 0.14, dur = 2.4) => noise({ t0: at(frame), dur, amp, env: perc(0.002, 1.5), cutoff: () => 13000, hp: 4500 });
const pad = (f0, f1, notes, amp = 0.016, pump = false) => {
  const d = at(f1) - at(f0) + 0.3;
  chord(notes, { t0: at(f0), dur: d, amp, partials: SOFT, detune: 0.004, env: (t) => swell(0.4, 0.5, d)(t) * (pump ? 1 - 0.6 * Math.exp(-((t % beatSec) / 0.09)) : 1) });
};

// C major, I – V – vi – IV for the lift; A minor for the trouble.
const LIFT = [
  { root: 29, notes: [57, 60, 64, 69] }, // Fmaj7
  { root: 31, notes: [59, 62, 67, 71] }, // G
  { root: 28, notes: [55, 59, 62, 67] }, // Em7
  { root: 33, notes: [57, 60, 64, 67] }, // Am7
];
const DROP = S.turn[0];
const chordAt = (f) => LIFT[((Math.floor((f - DROP) / BAR) % 4) + 4) % 4];

function groove(f0, f1, { four = true, claps = true, hats = true, bass = true, arp = true, pads = true, amp = 1 } = {}) {
  for (let f = f0, b = 0; f < f1; f += BEAT, b++) {
    if (four || b % 2 === 0) kick(f, 0.4 * amp);
    if (claps && b % 2 === 1) clap(f, 0.28 * amp);
    if (hats) hat(f + BEAT / 2, 0.06 * amp, 0.3, true);
  }
  for (let f = f0, s = 0; f < f1; f += BEAT / 4, s++) if (hats) hat(f, (s % 2 ? 0.03 : 0.045) * amp, s % 2 ? 0.35 : -0.2);
  for (let f = f0, e = 0; f < f1; f += BEAT / 2, e++) {
    const c = chordAt(f);
    if (bass) voice({ t0: at(f), dur: 0.42, freq: midi(c.root + (e % 4 === 3 ? 12 : 0)), amp: 0.14 * amp, partials: PLUCK, env: perc(0.003, 6.5) });
    if (arp) { const A = [0, 2, 1, 3, 2, 1, 3, 2]; mar(f, c.notes[A[e % 8]] + 12, 0.03 * amp, e % 2 ? 0.45 : -0.45, 8); }
  }
  if (pads) for (let f = f0; f < f1; f += BAR) pad(f, Math.min(f + BAR, f1), chordAt(f).notes.map((m) => m - 12), 0.016 * amp, true);
}


// ---------- Ambience ----------
function waves(f0, f1, amp = 0.05) {
  const t0 = at(f0), d = at(f1) - t0;
  noise({ t0, dur: d, amp, pan: -0.2, env: (t) => (0.35 + 0.65 * Math.sin(Math.PI * ((t / 6.5) % 1)) ** 2) * Math.min(1, t / 1.5, (d - t) / 1.5), cutoff: (t) => 380 + 900 * Math.sin(Math.PI * ((t / 6.5) % 1)) ** 2 });
  noise({ t0: t0 + 2.3, dur: Math.max(0.1, d - 2.3), amp: amp * 0.8, pan: 0.25, env: (t) => (0.3 + 0.7 * Math.sin(Math.PI * ((t / 8.1) % 1)) ** 2) * Math.min(1, t / 1.5, (d - 2.3 - t) / 1.5), cutoff: (t) => 500 + 1200 * Math.sin(Math.PI * ((t / 8.1) % 1)) ** 2, hp: 150 });
}
function crickets(f0, f1, amp = 0.012) {
  for (let s = at(f0), k = 0; s < at(f1); s += 0.42 + 0.08 * Math.abs(rand()), k++) {
    const pan = k % 2 ? 0.55 : -0.5, fr = 4300 + 300 * (k % 3);
    for (let p = 0; p < 3; p++) voice({ t0: s + p * 0.045, dur: 0.03, freq: fr, amp, pan, env: (t) => Math.sin((Math.PI * t) / 0.03) });
  }
}
const bird = (frame, base = 2600, amp = 0.02, pan = 0.4) => {
  for (let k = 0; k < 4; k++) voice({ t0: at(frame) + k * 0.085, dur: 0.07, glide: (t) => base * (1 + 0.55 * (t / 0.07)) * (k % 2 ? 1.12 : 1), amp: amp * (1 - k * 0.12), pan, env: (t) => Math.sin((Math.PI * t) / 0.07) });
};
const whoosh = (frame, amp = 0.1, pan = 0) => noise({ t0: at(frame), dur: 0.9, amp, pan, env: (t) => (t < 0.7 ? (t / 0.7) ** 2 : Math.max(0, 1 - (t - 0.7) / 0.2)), cutoff: (t) => 800 + 7000 * Math.min(1, t / 0.75), hp: 500 });

waves(0, cues.total, 0.05);

// ---------- 1. Hook: 3 AM, crickets, messages arc in ----------
{
  const [a, b] = S.hook, HK = cues.hook;
  pad(a, b, [45, 52, 59, 64], 0.015);
  crickets(a, S.problem[0] + 100);
  const MOT = [76, 79, 81, 84, 81, 79];
  for (let f = a + BEAT * 2, k = 0; f < b - 6; f += BEAT, k++) mar(f, MOT[k % 6], 0.026, k % 2 ? 0.35 : -0.35, 6);
  bell(a + HK.title, 84, 0.05);
  HK.arcs.forEach((f, i) => whoosh(a + f - 4, 0.07 + (i < 3 ? 0.03 : 0), i % 2 ? 0.4 : -0.4));
  HK.msgs.forEach((f, i) => ping(a + f, 0.06, (i - 1) * 0.3));
  for (let f = a + 90; f < b; f += BEAT) { kick(f, 0.14); hat(f + BEAT / 2, 0.025); }
  swish(b - 10, 0.14);
}

// ---------- 2. Problem: the clock runs, dawn birds, the booking is lost ----------
{
  const [a, b] = S.problem, PB = cues.problem;
  pad(a, a + PB.chat, [45, 52, 57, 60], 0.016);
  for (let f = a + 6, k = 0; f < a + PB.chat; f += BEAT / 2, k++) tick(f, k % 2 ? 0.035 : 0.06, k % 2 === 0);
  noise({ t0: at(a + PB.clock[0]), dur: at(PB.clock[1] - PB.clock[0]), amp: 0.05, env: (t) => Math.sin((Math.PI * t) / at(PB.clock[1] - PB.clock[0])), cutoff: (t) => 900 + 5000 * t, hp: 500 });
  [0, 14, 31, 50, 66, 90, 112, 130].forEach((d, k) => bird(a + PB.clock[0] + 50 + d, 2300 + (k % 3) * 500, 0.018, k % 2 ? 0.5 : -0.45));
  swish(a + PB.chat - 4, 0.1);
  pad(a + PB.chat, b, [41, 48, 57, 64], 0.014);
  popIn(a + PB.reply, 79, 0.05);
  popIn(a + PB.bye, 72, 0.05);
  [76, 72, 69, 64].forEach((m, k) => bell(a + PB.bye + 10 + k * 8, m, 0.04, k % 2 ? 0.3 : -0.3, 3));
  kick(a + PB.lost + 6, 0.4); snap(a + PB.lost + 6, 0.2); boom(a + PB.lost + 6, 0.45);
  riser(b - 40, b, 0.28);
  for (let k = 0, f = b - 24; f < b; f += 3, k++) snap(f, 0.03 + k * 0.014);
}

// ---------- 3. Turn: the drop ----------
{
  const [a] = S.turn, TN = cues.turn;
  kick(a, 0.6); clap(a, 0.42); crash(a, 0.16, 3); boom(a, 0.35);
  chord([41, 53, 57, 60, 64, 69], { t0: at(a), dur: 2.6, amp: 0.035, partials: PLUCK, env: perc(0.003, 1.3) });
  bell(a + TN.logo, 84, 0.07); bell(a + TN.logo + 4, 91, 0.05);
  groove(a + BAR, S.close[0], {});
  pad(a, a + BAR, LIFT[0].notes.map((m) => m - 12), 0.02);
}

// ---------- 4. Answer ----------
{
  const [a, b] = S.answer, AN = cues.answer;
  swish(a - 10, 0.16);
  AN.rates.forEach((r, i) => popIn(a + r, 79 + i * 2, 0.045, (i - 1) * 0.3));
  swish(a + 20, 0.1);
  popIn(a + AN.ask, 81, 0.06);
  for (let k = 0; k < 6; k++) keyClick(a + AN.typing + 2 + k * 4, 0.06);
  popIn(a + AN.reply, 88, 0.07); bell(a + AN.reply + 8, 93, 0.035);
  bell(a + AN.fast, 91, 0.04);
  [79, 84, 88].forEach((m, k) => mar(a + AN.handoff + k * 4, m, 0.05, (k - 1) * 0.3, 7));
  swish(b - 10, 0.16);
}

// ---------- 5. Languages ----------
{
  const [a, b] = S.langs, LG = cues.langs;
  LG.pairs.forEach((p, i) => { popIn(a + p, [76, 79, 81, 84][i % 4], 0.045, -0.25); popIn(a + p + LG.gap, [83, 86, 88, 91][i % 4], 0.05, 0.25); });
  for (let k = 3; k < LG.pairs.length; k++) swish(a + LG.pairs[k] - 4, 0.05, 0.2);
  for (let k = 0; k < 11; k++) mar(a + LG.sub + k * 2, [76, 79, 81, 84, 86, 88, 91, 93, 96, 98, 100][k], 0.035, (k - 5) * 0.08, 9);
  swish(b - 10, 0.16);
}

// ---------- 6. Wake: morning birds, approve ----------
{
  const [a, b] = S.wake, WK = cues.wake;
  [6, 24, 52, 90, 128, 170].forEach((d, k) => bird(a + d, 2500 + (k % 3) * 450, 0.016, k % 2 ? 0.55 : -0.5));
  swish(a + WK.panel, 0.1);
  for (let k = 0; k < 14; k++) tick(a + WK.stats + Math.round(k * 2.1), 0.035, k % 2 === 0);
  popIn(a + WK.slip, 79, 0.05);
  keyClick(a + WK.tap, 0.18); snap(a + WK.tap, 0.2);
  chord([76, 79, 84, 88], { t0: at(a + WK.tap + 3), dur: 1.2, amp: 0.045, partials: MARIMBA, env: perc(0.002, 4) });
  popIn(a + WK.ask, 74, 0.05);
  swish(b - 10, 0.16);
}

// ---------- 7. Close: a breath, then the final hit ----------
{
  const [a, b] = S.close, CL = cues.close;
  const hit = a + CL.hit;
  pad(a, hit, [41, 53, 57, 64], 0.02);
  bell(a + CL.line, 84, 0.05); bell(a + CL.line + 10, 88, 0.04);
  riser(hit - 36, hit, 0.24);
  kick(hit, 0.62); clap(hit, 0.45); crash(hit, 0.16, 3.2); boom(hit, 0.32);
  chord([29, 41, 53, 57, 60, 64, 69], { t0: at(hit), dur: 3.4, amp: 0.035, partials: PLUCK, env: perc(0.003, 1.1) });
  groove(hit, hit + BAR, { amp: 0.65 });
  [72, 76, 79, 84, 79, 76, 79, 88].forEach((m, k) => mar(hit + 6 + k * (BEAT / 2), m, 0.05, k % 2 ? 0.3 : -0.3, 6));
  const tl = at(b) - at(hit + BAR);
  chord([29, 41, 48, 57, 60, 64, 69], { t0: at(hit + BAR), dur: tl, amp: 0.02, partials: SOFT, detune: 0.003, env: (t) => Math.min(1, t / 0.05) * Math.exp(-t * 0.5) });
  bell(hit + BAR, 84, 0.06); bell(hit + BAR, 91, 0.04);
  bird(hit + BAR + 20, 2700, 0.018, 0.5); bird(hit + BAR + 50, 3100, 0.014, -0.5);
}

// ---------- Reverb (Schroeder) ----------
function reverb(input, delaysMs, mix) {
  const out = new Float32Array(N);
  for (const ms of delaysMs) {
    const d = Math.floor((ms / 1000) * SR), buf = new Float32Array(d);
    let idx = 0, lp = 0;
    for (let i = 0; i < N; i++) {
      const y = buf[idx];
      lp = y * 0.65 + lp * 0.35;
      buf[idx] = input[i] + lp * 0.83;
      out[i] += y / delaysMs.length;
      idx = (idx + 1) % d;
    }
  }
  for (const ms of [5.0, 1.7]) {
    const d = Math.floor((ms / 1000) * SR), buf = new Float32Array(d);
    let idx = 0;
    for (let i = 0; i < N; i++) {
      const y = -0.5 * out[i] + buf[idx];
      buf[idx] = out[i] + 0.5 * y;
      out[i] = y;
      idx = (idx + 1) % d;
    }
  }
  for (let i = 0; i < N; i++) input[i] = input[i] * (1 - mix * 0.4) + out[i] * mix;
}
reverb(L, [23.1, 27.7, 31.3, 35.9], 0.24);
reverb(R, [24.3, 26.9, 32.9, 36.7], 0.24);

// ---------- Master: fades, normalize, soft limit ----------
let peak = 0;
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const fade = Math.min(1, t / 0.2) * Math.min(1, (SECONDS - t) / 1.2);
  L[i] *= fade; R[i] *= fade;
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const DRIVE = 1.9, norm = Math.tanh(DRIVE);
const data = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) {
  const l = (Math.tanh((L[i] / peak) * DRIVE) / norm) * 0.92;
  const r = (Math.tanh((R[i] / peak) * DRIVE) / norm) * 0.92;
  data.writeInt16LE(Math.round(l * 32767), i * 4);
  data.writeInt16LE(Math.round(r * 32767), i * 4 + 2);
}
for (const [name, [a, b]] of Object.entries(S)) {
  let sum = 0;
  const i0 = Math.floor(at(a) * SR), i1 = Math.min(N, Math.floor(at(b) * SR));
  for (let i = i0; i < i1; i++) sum += (data.readInt16LE(i * 4) / 32767) ** 2;
  console.log(`  ${name.padEnd(8)} ${(20 * Math.log10(Math.sqrt(sum / (i1 - i0)) + 1e-9)).toFixed(1)} dBFS RMS`);
}
const header = Buffer.alloc(44);
header.write("RIFF", 0); header.writeUInt32LE(36 + data.length, 4); header.write("WAVE", 8);
header.write("fmt ", 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(2, 22);
header.writeUInt32LE(SR, 24); header.writeUInt32LE(SR * 4, 28); header.writeUInt16LE(4, 32); header.writeUInt16LE(16, 34);
header.write("data", 36); header.writeUInt32LE(data.length, 40);
const out = join(here, "..", "public", "soundtrack.wav");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, Buffer.concat([header, data]));
console.log(`Wrote ${out} (${SECONDS.toFixed(1)}s)`);
