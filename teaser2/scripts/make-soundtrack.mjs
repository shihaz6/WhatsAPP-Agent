// Generates public/soundtrack.wav for teaser 2, synced to src/cues.json.
// Fully synthesized (no samples, no licensing questions). Bright and upbeat, a different world from teaser 1:
//   ask     near silence, a soft pad, real keyboard clicks, a send "whoop", a marimba chord on "I do.", a run-up
//   flood   the drop: four-on-the-floor, claps, swung shaker, pluck bass, marimba; a rising note on every answer
//   flow    packet zips between stations, a chime + snap at each, key ticks and pops for the interface
//   build   half-time; a pitched thud as each layer lands; a sweep into the fold
//   grid    full groove; a swish + note per tile flip
//   close   breakdown under the bookend chat, snap roll, then the final hit and a marimba tag
// Usage: node scripts/make-soundtrack.mjs

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
let seed = 7;
const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1;

function put(i, v, pan) { if (i >= 0 && i < N) { L[i] += v * (1 - pan); R[i] += v * (1 + pan); } }

const perc = (a, d) => (t) => Math.min(1, t / a) * Math.exp(-t * d);
const swell = (a, r, dur) => (t) => Math.max(0, Math.min(1, t / a, (dur - t) / r));
const SAW = [[1, 1], [2, 0.5], [3, 0.33], [4, 0.25], [5, 0.2], [6, 0.16], [7, 0.14]];
const SOFT = [[1, 1], [2, 0.3], [3, 0.12]];
const BELL = [[1, 1], [2.76, 0.22], [5.4, 0.06]];

function voice({ t0, dur, freq = 440, glide, amp, pan = 0, partials = [[1, 1]], env }) {
  const s0 = Math.floor(t0 * SR), n = Math.floor(dur * SR);
  let ph = 0;
  for (let j = 0; j < n; j++) {
    const t = j / SR;
    ph += (2 * Math.PI * (glide ? glide(t) : freq)) / SR;
    let v = 0;
    for (const [m, a] of partials) v += a * Math.sin(ph * m);
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

// ---------- Instruments (bright pop kit, nothing dark) ----------
const MARIMBA = [[1, 1], [3.9, 0.32], [9.2, 0.07]];
const PLUCK = [[1, 1], [2, 0.45], [3, 0.2], [4, 0.08]];
const BEAT = cues.beat, DROP = cues.drop;
const beatSec = BEAT / FPS;

const mar = (frame, m, amp = 0.06, pan = 0, decay = 7) => voice({ t0: at(frame), dur: 1.2, freq: midi(m), amp, pan, partials: MARIMBA, env: perc(0.001, decay) });
const kickT = (frame, amp = 0.36) => voice({ t0: at(frame), dur: 0.3, glide: (t) => 55 + 95 * Math.exp(-t * 45), amp, env: perc(0.002, 14) });
const clap = (frame, amp = 0.32) => {
  for (const [dt, a] of [[0, 0.7], [0.011, 0.8], [0.023, 1]]) noise({ t0: at(frame) + dt, dur: 0.06, amp: amp * a, env: perc(0.0005, 60), cutoff: () => 3800, hp: 900 });
  noise({ t0: at(frame) + 0.03, dur: 0.25, amp: amp * 0.45, env: perc(0.001, 14), cutoff: () => 3200, hp: 1200 });
};
const shaker = (frame, amp = 0.07, pan = 0.3) => noise({ t0: at(frame), dur: 0.07, amp, pan, env: (t) => Math.min(1, t / 0.012) * Math.exp(-t * 55), cutoff: () => 13000, hp: 6500 });
const snap = (frame, amp = 0.2) => { noise({ t0: at(frame), dur: 0.05, amp, env: perc(0.0003, 90), cutoff: () => 9000, hp: 2500 }); voice({ t0: at(frame), dur: 0.03, freq: 2100, amp: amp * 0.3, env: perc(0.0003, 120) }); };
const keyClick = (frame, amp = 0.09) => {
  noise({ t0: at(frame), dur: 0.03, amp, pan: -0.15, env: perc(0.0003, 140), cutoff: () => 6500 + 2000 * Math.abs(rand()), hp: 1800 });
  voice({ t0: at(frame), dur: 0.02, freq: 1500 + 400 * Math.abs(rand()), amp: amp * 0.25, env: perc(0.0002, 200) });
};
const whoop = (frame, amp = 0.09) => voice({ t0: at(frame), dur: 0.16, glide: (t) => 320 + 1300 * (t / 0.16) ** 1.4, amp, partials: SOFT, env: (t) => Math.sin((Math.PI * t) / 0.16) });
const popIn = (frame, m = 81, amp = 0.07, pan = 0) => { mar(frame, m, amp, pan, 11); mar(frame + 2.5, m + 5, amp * 0.8, pan, 11); };
const swish = (frame, amp = 0.16, pan = 0) => noise({ t0: at(frame), dur: 0.22, amp, pan, env: (t) => Math.sin((Math.PI * t) / 0.22) ** 2, cutoff: (t) => 2500 + 9000 * (t / 0.22), hp: 1500 });
const thud = (frame, m, amp = 0.38) => { voice({ t0: at(frame), dur: 0.6, glide: (t) => midi(m) * (1 + 0.8 * Math.exp(-t * 30)), amp, partials: SOFT, env: perc(0.002, 7) }); noise({ t0: at(frame), dur: 0.08, amp: 0.2, env: perc(0.001, 40), cutoff: () => 3000, hp: 400 }); };
const swellUp = (f0, f1, amp = 0.22) => { const t0 = at(f0), d = at(f1) - t0; noise({ t0, dur: d, amp, env: (t) => (t / d) ** 3, cutoff: (t) => 800 + 8000 * (t / d) ** 2, hp: 600 }); };

// D major, I - vi - IV - V
const PROG = [
  { root: 38, notes: [62, 66, 69, 76] }, // D add9
  { root: 35, notes: [59, 62, 66, 73] }, // Bm
  { root: 31, notes: [55, 59, 62, 69] }, // G
  { root: 33, notes: [57, 61, 64, 71] }, // A
];
const BAR = BEAT * 4;
const chordAt = (f) => PROG[((Math.floor((f - DROP) / BAR) % 4) + 4) % 4];
const PENT = [74, 76, 78, 81, 83, 86, 88, 90, 93, 95, 98, 100];

// Groove: options per section
function groove(f0, f1, { kick = "four", claps = true, shake = true, bass = true, arp = true, pad = true, amp = 1 } = {}) {
  for (let f = f0, b = 0; f < f1; f += BEAT, b++) {
    if (kick === "four" || (kick === "half" && b % 2 === 0)) kickT(f, 0.36 * amp);
    if (claps && b % 2 === 1) clap(f, 0.3 * amp);
  }
  for (let f = f0, s = 0; f < f1; f += BEAT / 4, s++) {
    const swing = s % 2 ? BEAT * 0.06 : 0;
    if (shake) shaker(f + swing, (s % 4 === 2 ? 0.075 : 0.045) * amp, s % 2 ? 0.35 : 0.15);
  }
  for (let f = f0, e = 0; f < f1; f += BEAT / 2, e++) {
    const c = chordAt(f);
    if (bass) voice({ t0: at(f), dur: 0.4, freq: midi(c.root + (e % 4 === 3 ? 12 : 0)), amp: 0.13 * amp, partials: PLUCK, env: perc(0.003, 7) });
    if (arp) { const ARP = [0, 2, 1, 3, 2, 1, 3, 2]; mar(f, c.notes[ARP[e % 8]] + 12, 0.028 * amp, e % 2 ? 0.45 : -0.45, 9); }
  }
  if (pad) for (let f = f0; f < f1; f += BAR) {
    const c = chordAt(f), d = at(Math.min(f + BAR, f1)) - at(f) + 0.2;
    chord(c.notes.map((m) => m - 12), {
      t0: at(f), dur: d, amp: 0.016 * amp, partials: SOFT,
      env: (t) => swell(0.05, 0.2, d)(t) * (1 - 0.65 * Math.exp(-((t % beatSec) / 0.09))), // sidechain pump
    });
  }
}

// ---------- Ask: quiet room, typing, send, "I do." ----------
const A = cues.ask;
chord([62, 66, 69, 76].map((m) => m - 12), { t0: 0, dur: at(DROP), amp: 0.01, partials: SOFT, env: (t) => Math.min(1, t / 1.5) * (0.6 + 0.4 * Math.sin(t * 1.3)) });
for (let f = A.typeFrom; f < A.typeTo; f += 1.7 + 1.4 * Math.abs(rand())) keyClick(f);
whoop(A.send);
for (let k = 0; k < 4; k++) snap(A.dots + 2 + k * 7, 0.05);
mar(A.reply, 74, 0.09, -0.2); mar(A.reply, 78, 0.08, 0.2); mar(A.reply, 81, 0.08); mar(A.reply + 3, 86, 0.08); snap(A.reply, 0.25);
voice({ t0: at(A.reply), dur: 0.5, glide: (t) => 70 + 60 * Math.exp(-t * 20), amp: 0.22, env: perc(0.002, 9) });
for (let k = 0, f = DROP - 32; f < DROP; f += 4, k++) mar(f, PENT[k % PENT.length], 0.03 + k * 0.004, k % 2 ? 0.4 : -0.4, 12); // run-up
swellUp(DROP - 32, DROP, 0.24);

// ---------- Flood: the drop; a rising note on every answer ----------
const [f0, f1] = cues.scenes.flood;
clap(DROP, 0.4); mar(DROP, 74, 0.08); mar(DROP, 86, 0.06);
groove(f0, f1);
for (let k = 0; k < cues.flood.count; k++) {
  const f = f0 + cues.flood.first + k * cues.flood.every + Math.round(cues.flood.every * 0.6);
  if (f < f1) mar(f, PENT[k % PENT.length], 0.055, k % 2 ? 0.3 : -0.3, 10);
}

// ---------- Flow: groove, packet zips, a chime at each station ----------
const [w0, w1] = cues.scenes.flow, NODES = cues.flow.nodes;
groove(w0, w0 + BAR * 2, { claps: false, amp: 0.85 });
groove(w0 + BAR * 2, w1, { amp: 0.95 });
let prev = w0 + 6;
NODES.forEach((n, i) => {
  const at0 = w0 + n;
  noise({ t0: at(prev), dur: at(at0) - at(prev), amp: 0.05, env: (t) => Math.sin((Math.PI * t) / (at(at0) - at(prev))), cutoff: (t) => 1200 + 5000 * (t / (at(at0) - at(prev))), hp: 900 });
  const c = [[74, 78, 81], [76, 79, 83], [78, 81, 86], [81, 85, 88]][i];
  c.forEach((m, k) => mar(at0 + k * 1.5, m, 0.065, (k - 1) * 0.3, 8));
  snap(at0, 0.14);
  prev = at0;
});
for (let f = w0 + NODES[0] + 4; f < w0 + NODES[0] + 30; f += 2.2) keyClick(f, 0.045);
for (let k = 0; k < 4; k++) popIn(w0 + NODES[1] + 6 + k * 7, [79, 81, 83, 86][k], 0.035, 0.3);
for (let f = w0 + NODES[2] + 4; f < w0 + NODES[2] + 34; f += 2.4) keyClick(f, 0.04);
for (let k = 0; k < 3; k++) popIn(w0 + NODES[3] + 4 + k * 9, [81, 85, 88][k], 0.04, -0.2);
swish(w1 - 10, 0.2);

// ---------- Build: half-time, a thud for each layer, fold sweep ----------
const [b0, b1] = cues.scenes.build, BD = cues.build;
groove(b0, b1, { kick: "half", claps: false, arp: false, amp: 0.8 });
BD.drops.forEach((d, i) => { thud(b0 + d, [50, 47, 45, 43][i]); mar(b0 + d + 2, [86, 83, 81, 78][i], 0.04, 0.3, 9); });
swellUp(b0 + BD.fold - 6, b0 + BD.folded, 0.2);
chord([62, 66, 69, 74, 78], { t0: at(b0 + BD.folded), dur: 1.4, amp: 0.035, partials: MARIMBA, env: perc(0.002, 3) });
snap(b0 + BD.folded, 0.3); clap(b0 + BD.folded, 0.3);
swish(b1 - 10, 0.2);

// ---------- Grid: full groove, a flip + note per tile ----------
const [g0, g1] = cues.scenes.grid;
groove(g0, g1);
for (let i = 0; i < 8; i++) {
  const f = g0 + cues.grid.first + i * cues.grid.every;
  swish(f, 0.09, (i % 4) / 3 - 0.5);
  mar(f + 4, PENT[(i + 2) % PENT.length], 0.05, (i % 4) / 3 - 0.5, 10);
}

// ---------- Close: breakdown, the bookend chat, then the final hit ----------
const [c0, c1] = cues.scenes.close, K = cues.close;
const hit = c0 + K.hit;
chord([62, 66, 69, 76].map((m) => m - 12), { t0: at(c0), dur: at(hit) - at(c0) + 0.1, amp: 0.016, partials: SOFT, env: swell(0.4, 0.1, at(hit) - at(c0) + 0.1) });
for (let f = c0; f < hit - 20; f += BEAT) mar(f, [74, 78, 81, 78][Math.floor((f - c0) / BEAT) % 4], 0.022, 0.3, 6);
for (let f = c0 + K.typeFrom; f < c0 + K.typeTo; f += 1.7 + 1.4 * Math.abs(rand())) keyClick(f);
whoop(c0 + K.send);
for (let k = 0; k < 3; k++) snap(c0 + K.dots + 2 + k * 7, 0.05);
mar(c0 + K.reply, 78, 0.08, -0.2); mar(c0 + K.reply, 81, 0.08, 0.2); mar(c0 + K.reply + 3, 86, 0.07);
swellUp(hit - 26, hit, 0.3);
for (let k = 0, f = hit - 16; f < hit; f += 2, k++) snap(f, 0.04 + k * 0.012);

// The hit and the lockup
kickT(hit, 0.5); clap(hit, 0.45);
noise({ t0: at(hit), dur: 2.6, amp: 0.16, env: perc(0.002, 1.4), cutoff: () => 12000, hp: 5000 }); // cymbal wash
chord([50, 62, 66, 69, 74, 76, 81], { t0: at(hit), dur: 3, amp: 0.03, partials: PLUCK, env: perc(0.003, 1.3) });
groove(hit, hit + BAR * 2, { claps: true, amp: 0.8 });
const tagNotes = [74, 78, 81, 86, 81, 78, 81, 86, 90];
tagNotes.forEach((m, k) => mar(hit + 8 + k * (BEAT / 2), m, 0.06, k % 2 ? 0.3 : -0.3, 6));
const tail = SECONDS - at(hit + BAR * 2);
chord([50, 57, 62, 66, 69, 76], { t0: at(hit + BAR * 2), dur: tail, amp: 0.024, partials: SOFT, env: (t) => Math.min(1, t / 0.02) * Math.exp(-t * 0.5) });
mar(hit + BAR * 2, 74, 0.07); mar(hit + BAR * 2, 86, 0.05); mar(hit + BAR * 2 + 3, 90, 0.04);

// ---------- Reverb (Schroeder) ----------
function reverb(input, delaysMs, mix) {
  const out = new Float32Array(N);
  for (const ms of delaysMs) {
    const d = Math.floor((ms / 1000) * SR), buf = new Float32Array(d);
    let idx = 0, lp = 0;
    for (let i = 0; i < N; i++) {
      const y = buf[idx];
      lp = y * 0.65 + lp * 0.35;
      buf[idx] = input[i] + lp * 0.82;
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
reverb(L, [23.1, 27.7, 31.3, 35.9], 0.22);
reverb(R, [24.3, 26.9, 32.9, 36.7], 0.22);

// ---------- Master: fades, normalize, soft limit ----------
let peak = 0;
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const fade = Math.min(1, t / 0.3) * Math.min(1, (SECONDS - t) / 1.5);
  L[i] *= fade; R[i] *= fade;
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const DRIVE = 1.8, norm = Math.tanh(DRIVE);
const data = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) {
  const l = (Math.tanh((L[i] / peak) * DRIVE) / norm) * 0.92;
  const r = (Math.tanh((R[i] / peak) * DRIVE) / norm) * 0.92;
  data.writeInt16LE(Math.round(l * 32767), i * 4);
  data.writeInt16LE(Math.round(r * 32767), i * 4 + 2);
}

// Loudness per scene, so a silent or clipped section is easy to spot.
for (const [name, [a, b]] of Object.entries(S)) {
  let sum = 0;
  const i0 = Math.floor(at(a) * SR), i1 = Math.min(N, Math.floor(at(b) * SR));
  for (let i = i0; i < i1; i++) sum += (data.readInt16LE(i * 4) / 32767) ** 2;
  console.log(`  ${name.padEnd(10)} ${(20 * Math.log10(Math.sqrt(sum / (i1 - i0)) + 1e-9)).toFixed(1)} dBFS RMS`);
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
