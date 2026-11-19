// Generates public/soundtrack.wav for the small-shop story, synced to src/cues.json. Fully synthesized, no samples.
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
  { root: 36, notes: [60, 64, 67, 71] }, // Cmaj7
  { root: 31, notes: [59, 62, 67, 69] }, // G add9-ish
  { root: 33, notes: [60, 64, 69, 71] }, // Am9
  { root: 29, notes: [57, 60, 65, 69] }, // Fmaj7
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

// ---------- 1. Meet: a warm morning, soft marimba ----------
{
  const [a, b] = S.meet;
  pad(a, b, [48, 55, 64, 71], 0.014);
  const MEL = [72, 76, 79, 76, 74, 77, 81, 77];
  for (let f = a + BEAT, k = 0; f < b - 4; f += BEAT / 2, k++) mar(f, MEL[k % 8], 0.03 + 0.01 * (k % 4 === 0), k % 2 ? 0.35 : -0.35, 7);
  for (let f = a + BAR * 2; f < b; f += BEAT) { kick(f, 0.16); hat(f + BEAT / 2, 0.03); }
  bell(a + cues.meet.name, 84, 0.06);
  // the day rushing by: a soft tick per hour
  for (let k = 0; k < 14; k++) tick(a + cues.meet.dayStart + Math.round((k / 14) * (cues.meet.dayEnd - cues.meet.dayStart)), 0.035, k % 2 === 0);
  swish(b - 10, 0.16);
}

// ---------- 2. Pain: a tense pulse, one ping per message ----------
{
  const [a, b] = S.pain, P = cues.pain;
  const same = a + P.same;
  pad(a, same, [45, 52, 60, 64], 0.014);
  for (let f = a, s = 0; f < same; f += BEAT / 4, s++) {
    const build = (f - a) / (same - a);
    voice({ t0: at(f), dur: 0.12, freq: midi(33), amp: 0.06 + 0.06 * build, partials: PLUCK, env: perc(0.002, 22) });
    if (s % 2 === 0) tick(f, 0.02 + 0.03 * build, s % 4 === 0);
    if (s % 8 === 0 && build > 0.25) kick(f, 0.2 + 0.15 * build);
  }
  P.pings.forEach((p, i) => ping(a + p, 0.055 + i * 0.002, ((i % 5) - 2) * 0.2));
  riser(same - 24, same, 0.12);
  // "Same questions." — a stab, then the air rings
  kick(same, 0.45); clap(same, 0.3); crash(same, 0.08, 1.6);
  chord([45, 57, 60, 64, 69], { t0: at(same), dur: 2.4, amp: 0.03, partials: PLUCK, env: perc(0.003, 1.6) });
  for (let f = same + BEAT; f < b; f += BEAT) { kick(f, 0.22); tick(f + BEAT / 2, 0.03); }
  swish(b - 10, 0.16);
}

// ---------- 3. Loss: everything drains away ----------
{
  const [a, b] = S.loss, LS = cues.loss;
  pad(a, a + LS.lost, [45, 52, 57, 60], 0.016);
  // the seesaw: a two-note tug
  for (let f = a + 8, k = 0; f < a + 96; f += BEAT * 2, k++) { mar(f, k % 2 ? 69 : 72, 0.035, k % 2 ? 0.4 : -0.4, 5); voice({ t0: at(f), dur: 0.5, freq: midi(33), amp: 0.1, partials: SOFT, env: perc(0.004, 5) }); }
  swish(a + 96, 0.1);
  popIn(a + LS.msg, 76, 0.05);
  // the hour going by: clock ticks that speed up
  for (let k = 0, f = a + LS.jump; f < a + LS.jumpEnd; k++) { tick(f, 0.08, k % 2 === 0); f += Math.max(2, 9 - k * 0.6); }
  noise({ t0: at(a + LS.jump), dur: at(LS.jumpEnd - LS.jump), amp: 0.08, env: (t) => Math.sin(Math.PI * t / at(LS.jumpEnd - LS.jump)), cutoff: (t) => 1000 + 6000 * t, hp: 600 });
  popIn(a + LS.reply, 79, 0.045);
  popIn(a + LS.bye, 72, 0.05);
  [76, 72, 69, 64].forEach((m, k) => bell(a + LS.bye + 10 + k * 9, m, 0.045, k % 2 ? 0.3 : -0.3, 3));
  boom(a + LS.lost, 0.5);
  pad(a + LS.lost, b, [33, 45, 52], 0.012);
  riser(b - 52, b, 0.28);
  for (let k = 0, f = b - 30; f < b; f += 3, k++) snap(f, 0.03 + k * 0.012);
}

// ---------- 4. Turn: the drop ----------
{
  const [a, b] = S.turn, T = cues.turn;
  kick(a, 0.6); clap(a, 0.42); crash(a, 0.16, 3); boom(a, 0.35);
  chord([48, 60, 64, 67, 71, 76], { t0: at(a), dur: 2.6, amp: 0.035, partials: PLUCK, env: perc(0.003, 1.3) });
  bell(a + T.logo, 84, 0.07); bell(a + T.logo + 4, 91, 0.05);
  groove(a + BAR, b, {});
  pad(a, a + BAR, LIFT[0].notes.map((m) => m - 12), 0.02);
  swish(a + T.phone - 6, 0.14);
  popIn(a + T.ask, 81, 0.06);
  for (let k = 0; k < 6; k++) keyClick(a + T.typing + 2 + k * 5, 0.06);
  popIn(a + T.reply, 88, 0.07); bell(a + T.reply + 22, 93, 0.04);
  swish(b - 10, 0.16);
}

// ---------- 5. How: groove, list rows click in, a stamp, a handoff ----------
{
  const [a, b] = S.how, HW = cues.how;
  groove(a, b, { amp: 0.9 });
  HW.rows.forEach((r, i) => popIn(a + r, 79 + i * 2, 0.05, (i - 1) * 0.3));
  noise({ t0: at(a + HW.feed), dur: 1.2, amp: 0.05, env: (t) => Math.sin(Math.PI * t / 1.2), cutoff: (t) => 2000 + 5000 * t, hp: 1500 });
  popIn(a + HW.ask, 76, 0.06);
  noise({ t0: at(a + HW.scan), dur: 0.9, amp: 0.07, env: (t) => Math.sin(Math.PI * t / 0.9), cutoff: (t) => 3000 + 8000 * t, hp: 2500 });
  kick(a + HW.stamp, 0.35); snap(a + HW.stamp, 0.2); voice({ t0: at(a + HW.stamp), dur: 0.3, freq: midi(52), amp: 0.08, partials: SOFT, env: perc(0.002, 12) });
  popIn(a + HW.reply, 84, 0.06);
  [79, 84, 88].forEach((m, k) => mar(a + HW.handoff + k * 4, m, 0.05, (k - 1) * 0.3, 7));
  swish(b - 10, 0.16);
}

// ---------- 6. Control: a tap, numbers tick up ----------
{
  const [a, b] = S.control, K = cues.control;
  groove(a, b, { amp: 0.85 });
  swish(a + K.panel, 0.1);
  keyClick(a + K.tap, 0.18); snap(a + K.tap, 0.2);
  mar(a + K.tap + 3, 84, 0.06); mar(a + K.tap + 7, 88, 0.05);
  for (let k = 0; k < 15; k++) tick(a + K.count + Math.round(k * 2.2), 0.04, k % 2 === 0);
  bell(a + K.count + 36, 88, 0.04);
  swish(b - 10, 0.16);
}

// ---------- 7. Close: warm half-time, then the final hit ----------
{
  const [a, b] = S.close, CL = cues.close;
  const hit = a + CL.hit;
  groove(a, hit - BEAT * 2, { four: false, amp: 0.7 });
  CL.replies.forEach((r, i) => popIn(a + r, 84 + i * 3, 0.05, 0.3));
  riser(hit - 40, hit, 0.24);
  kick(hit, 0.62); clap(hit, 0.45); crash(hit, 0.16, 3.2); boom(hit, 0.32);
  chord([36, 48, 60, 64, 67, 71, 76], { t0: at(hit), dur: 3.4, amp: 0.035, partials: PLUCK, env: perc(0.003, 1.1) });
  groove(hit, hit + BAR, { amp: 0.65 });
  [76, 79, 84, 88, 84, 79, 84, 91].forEach((m, k) => mar(hit + 6 + k * (BEAT / 2), m, 0.05, k % 2 ? 0.3 : -0.3, 6));
  const tail = at(b) - at(hit + BAR);
  chord([36, 48, 55, 64, 67, 71, 76], { t0: at(hit + BAR), dur: tail, amp: 0.02, partials: SOFT, detune: 0.003, env: (t) => Math.min(1, t / 0.05) * Math.exp(-t * 0.5) });
  bell(hit + BAR, 84, 0.06); bell(hit + BAR, 91, 0.04);
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
