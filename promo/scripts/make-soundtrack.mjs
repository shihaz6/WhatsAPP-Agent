// Generates public/soundtrack.wav for the Catalyst promo, synced to src/cues.json.
// Fully synthesized (no samples, no licensing). Replace public/soundtrack.wav with your own
// track if you prefer (keep it ~35s), or render with --props='{"music":false}' for silence.
//   night     dark drone, heartbeat, a notification ping per message
//   pain      sub-boom + stab on every word, riser into the cut
//   turn      bright pad and soft bells
//   reveal    impact, sub drop, wide chord
//   features  120 BPM groove (beats line up with the 3s feature cuts), whooshes, riser into CTA
//   cta       impact, warm final chord, bells on the call to action
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
const kick = (t0, amp = 0.42) => voice({ t0, dur: 0.45, glide: (t) => 48 + 110 * Math.exp(-t * 32), amp, env: perc(0.002, 8) });
const whoosh = (frame, len = 0.55) => {
  const t0 = at(frame) - len * 0.75;
  noise({ t0, dur: len, amp: 0.55, env: (t) => Math.sin((Math.PI * t) / len) ** 2, cutoff: (t) => 500 + 6000 * Math.sin((Math.PI * t) / len) });
};
const riser = (f0, f1, amp = 0.45) => {
  const t0 = at(f0), d = at(f1) - t0;
  noise({ t0, dur: d, amp, env: (t) => (t / d) ** 2, cutoff: (t) => 300 + 9000 * (t / d) ** 2 });
  voice({ t0, dur: d, glide: (t) => 150 + 900 * (t / d) ** 2, amp: 0.035, partials: SOFT, env: (t) => (t / d) ** 1.5 });
};

// ---------- Night: drone, heartbeat, pings ----------
const darkEnd = at(S.pain[1]);
[[33, 1], [40, 0.6], [45, 0.5], [52, 0.22]].forEach(([m, a], k) =>
  voice({
    t0: 0, dur: darkEnd, freq: midi(m), amp: 0.05 * a, pan: (k - 1.5) * 0.15, partials: SOFT,
    env: (t) => Math.min(1, t / 1.2) * Math.min(1, (darkEnd - t) / 0.03) * (0.6 + (0.4 * t) / darkEnd),
  }));
for (let f = 10; f < S.night[1]; f += 30) {
  for (const [dt, a] of [[0, 1], [0.2, 0.65]]) voice({ t0: at(f) + dt, dur: 0.4, glide: (t) => 52 + 40 * Math.exp(-t * 30), amp: 0.26 * a, env: perc(0.004, 12) });
}
cues.pings.forEach((p, k) => {
  const pan = k % 2 ? 0.35 : -0.35;
  voice({ t0: at(p), dur: 0.7, freq: midi(91), amp: 0.05, pan, partials: BELL, env: perc(0.002, 9) });
  voice({ t0: at(p) + 0.07, dur: 0.9, freq: midi(96), amp: 0.045, pan, partials: BELL, env: perc(0.002, 7) });
});

// ---------- Pain: a hit on every word, riser into the cut ----------
cues.words.forEach((w, k) => {
  const big = k === cues.words.length - 1;
  const t0 = at(w);
  voice({ t0, dur: 1.4, glide: (t) => 38 + 95 * Math.exp(-t * 22), amp: big ? 0.55 : 0.4, env: perc(0.002, big ? 2.5 : 5) });
  noise({ t0, dur: 0.3, amp: 0.7, env: perc(0.001, 26), cutoff: () => 7000, hp: 900 });
  chord([45, 52, 57, 60], { t0, dur: 2, amp: 0.028, partials: SAW, env: perc(0.004, big ? 1.8 : 4.5) });
});
riser(S.pain[1] - 34, S.pain[1]);

// ---------- Turn: bright pad and bells ----------
const turn0 = at(S.turn[0]), turnDur = at(S.turn[1]) - turn0 + 0.3;
voice({ t0: turn0, dur: 1, glide: (t) => 50 + 35 * Math.exp(-t * 10), amp: 0.3, env: perc(0.01, 4) });
chord([48, 60, 64, 67, 71, 74], { t0: turn0, dur: turnDur, amp: 0.02, partials: SOFT, env: swell(0.25, 0.4, turnDur) });
[[6, 84], [22, 79], [38, 88], [56, 86], [74, 83], [92, 79]].forEach(([f, m], k) =>
  voice({ t0: at(S.turn[0] + f), dur: 2, freq: midi(m), amp: 0.05, pan: k % 2 ? 0.3 : -0.3, partials: [[1, 1], [2, 0.4], [3, 0.15]], env: perc(0.003, 2.4) }));
riser(S.turn[1] - 26, S.turn[1], 0.35);

// ---------- Reveal: impact, sub drop, chord ----------
const rv = at(S.reveal[0]);
voice({ t0: rv, dur: 3, glide: (t) => 30 + 70 * Math.exp(-t * 1.6), amp: 0.55, env: perc(0.002, 1.5) });
noise({ t0: rv, dur: 3, amp: 0.4, env: perc(0.001, 1.6), cutoff: () => 12000, hp: 2500 });
kick(rv, 0.55);
chord([41, 48, 53, 57, 67, 72], { t0: rv, dur: 4, amp: 0.026, partials: SAW, env: perc(0.005, 0.9) });
const revDur = at(S.features[0]) - rv + 0.4;
chord([53, 57, 60, 64, 67], { t0: rv + 0.2, dur: revDur, amp: 0.016, partials: SOFT, env: swell(0.6, 0.4, revDur) });
chord([84, 88], { t0: at(S.reveal[0] + 16), dur: 2, amp: 0.04, partials: BELL, env: perc(0.002, 3) }); // subhead

// ---------- Features: 120 BPM groove ----------
const B0 = S.features[0], BEAT = 15, BAR = 60, beatEnd = S.features[1] - 15;
const PROG = [
  { root: 41, notes: [53, 57, 60, 64] }, // Fmaj7
  { root: 40, notes: [52, 55, 60, 64] }, // C/E
  { root: 45, notes: [52, 55, 57, 60] }, // Am7
  { root: 43, notes: [50, 55, 59, 62] }, // G
];
const prog = (f) => PROG[Math.floor((f - B0) / BAR) % PROG.length];
for (let f = B0, b = 0; f < beatEnd; f += BEAT, b++) {
  kick(at(f));
  if (b % 2 === 1) noise({ t0: at(f), dur: 0.22, amp: 0.55, env: perc(0.002, 20), cutoff: () => 5000, hp: 800 });
}
for (let f = B0, h = 0; f < beatEnd; f += BEAT / 2, h++) {
  noise({ t0: at(f), dur: h % 2 ? 0.12 : 0.05, amp: h % 2 ? 0.22 : 0.16, pan: 0.25, env: perc(0.001, h % 2 ? 30 : 70), cutoff: () => 14000, hp: 7000 });
  const c = prog(f);
  voice({ t0: at(f), dur: 0.32, freq: midi(c.root), amp: 0.11, partials: [[1, 1], [2, 0.35]], env: perc(0.005, 8) });
  const ARP = [0, 1, 2, 3, 2, 1, 3, 2];
  voice({ t0: at(f), dur: 0.5, freq: midi(c.notes[ARP[h % 8]] + 12), amp: 0.032, pan: h % 2 ? 0.4 : -0.4, partials: SAW.slice(0, 4), env: perc(0.002, 10) });
}
for (let f = B0; f < S.features[1]; f += BAR) {
  const c = prog(f), d = at(Math.min(f + BAR, S.features[1])) - at(f) + 0.3;
  chord(c.notes, { t0: at(f), dur: d, amp: 0.012, partials: SOFT, env: swell(0.3, 0.3, d) });
}
cues.beats.slice(1).forEach((b) => whoosh(b));
riser(S.features[1] - 60, S.features[1], 0.5);
for (let f = S.features[1] - 30, k = 0; f < S.features[1] - 1; f += f < S.features[1] - 14 ? 3.75 : 1.875, k++) {
  noise({ t0: at(f), dur: 0.12, amp: 0.15 + k * 0.02, env: perc(0.001, 30), cutoff: () => 6000, hp: 1200 });
}

// ---------- CTA: impact, final chord, bells ----------
const en = at(S.cta[0]);
voice({ t0: en, dur: 3, glide: (t) => 30 + 70 * Math.exp(-t * 1.6), amp: 0.5, env: perc(0.002, 1.5) });
kick(en, 0.5);
noise({ t0: en, dur: 2.5, amp: 0.35, env: perc(0.001, 1.8), cutoff: () => 12000, hp: 2500 });
const tail = SECONDS - en;
chord([36, 43, 48, 52, 55, 62, 64], { t0: en, dur: tail, amp: 0.022, partials: SOFT, env: (t) => Math.min(1, t / 0.02) * Math.exp(-t * 0.3) });
whoosh(cues.ctaSwap, 0.5);
[[S.cta[0] + 14, 84], [cues.ctaSwap + 2, 91], [cues.ctaSwap + 12, 88]].forEach(([f, m], k) =>
  voice({ t0: at(f), dur: 3, freq: midi(m), amp: 0.045, pan: k % 2 ? 0.3 : -0.3, partials: BELL, env: perc(0.002, 1.8) }));

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
reverb(L, [29.7, 37.1, 41.1, 43.7], 0.38);
reverb(R, [30.9, 35.9, 40.3, 44.9], 0.38);

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
