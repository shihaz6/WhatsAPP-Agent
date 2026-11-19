// Generates public/soundtrack.wav for the dental demo, synced to src/cues.json. Fully synthesized, no samples.
// 100 BPM at 30 fps: one beat = 18 frames, one bar = 72. A major, piano-led; F# minor tension under the hook.
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
// a separate bus for the drums so the music can duck under the kick
const duck = new Float32Array(N).fill(1);

const at = (frame) => frame / FPS;
const midi = (m) => 440 * 2 ** ((m - 69) / 12);
let seed = 7;
const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1;
function put(i, v, pan) { if (i >= 0 && i < N) { L[i] += v * (1 - pan); R[i] += v * (1 + pan); } }

const perc = (a, d) => (t) => Math.min(1, t / a) * Math.exp(-t * d);
const swell = (a, r, dur) => (t) => Math.max(0, Math.min(1, t / a, (dur - t) / r));
const SOFT = [[1, 1], [2, 0.28], [3, 0.1]];
const BELL = [[1, 1], [2.76, 0.2], [5.4, 0.05]];
const MAR = [[1, 1], [3.9, 0.28], [9.2, 0.05]];

function voice({ t0, dur, freq = 440, glide, amp, pan = 0, partials = [[1, 1]], env, detune = 0, duckable = true }) {
  const s0 = Math.floor(t0 * SR), n = Math.floor(dur * SR);
  let ph = 0, ph2 = 0;
  for (let j = 0; j < n; j++) {
    const t = j / SR;
    const fr = glide ? glide(t) : freq;
    ph += (2 * Math.PI * fr) / SR;
    ph2 += (2 * Math.PI * fr * (1 + detune)) / SR;
    let v = 0;
    for (const [m, a] of partials) v += a * (detune ? 0.5 * (Math.sin(ph * m) + Math.sin(ph2 * m)) : Math.sin(ph * m));
    const i = s0 + j;
    put(i, v * amp * env(t) * (duckable && i < N ? duck[i] : 1), pan);
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

// ---------- Grid ----------
const BEAT = cues.beat, BAR = BEAT * 4, S16 = BEAT / 4;
const DROP = S.turn[0];
const beatSec = BEAT / FPS;

// ---------- Kick pattern first, so it can carve the duck envelope ----------
const kicks = [];
const kickAt = (frame, amp = 0.5) => kicks.push([frame, amp]);

// ---------- Instruments ----------
function piano(frame, m, vel = 0.06, pan = 0, len = 2.6, bright = 1) {
  const f0 = midi(m);
  const B = 0.00035;
  const parts = [];
  for (let n = 1; n <= 8; n++) parts.push([n * Math.sqrt(1 + B * n * n), (1 / n ** 1.5) * (n === 1 ? 1 : bright)]);
  // each partial its own decay: higher ones die faster
  parts.forEach(([mul, a], k) => {
    voice({ t0: at(frame), dur: len, freq: f0 * mul, amp: vel * a, pan, env: (t) => Math.min(1, t / 0.003) * Math.exp(-t * (1.1 + k * 0.9)) * (0.75 + 0.25 * Math.exp(-t * 6)) });
  });
  noise({ t0: at(frame), dur: 0.03, amp: vel * 0.25, pan, env: perc(0.0005, 160), cutoff: () => 5000, hp: 1500 });
}
const chordP = (frame, notes, vel = 0.05, len = 2.6, spread = 0) => notes.forEach((m, k) => piano(frame + k * spread, m, vel, (k / Math.max(1, notes.length - 1) - 0.5) * 0.7, len));
const bell = (frame, m, amp = 0.04, pan = 0, decay = 5) => voice({ t0: at(frame), dur: 1.6, freq: midi(m), amp, pan, partials: BELL, env: perc(0.001, decay) });
const mar = (frame, m, amp = 0.05, pan = 0, decay = 8) => voice({ t0: at(frame), dur: 1, freq: midi(m), amp, pan, partials: MAR, env: perc(0.001, decay) });
const popUI = (frame, m, amp = 0.05, pan = 0) => { mar(frame, m, amp, pan, 13); mar(frame + 2, m + 7, amp * 0.6, pan, 13); noise({ t0: at(frame), dur: 0.02, amp: amp * 0.4, pan, env: perc(0.0003, 200), cutoff: () => 6000, hp: 2000 }); };
const click = (frame, amp = 0.14) => { noise({ t0: at(frame), dur: 0.03, amp, env: perc(0.0003, 150), cutoff: () => 7500, hp: 1800 }); voice({ t0: at(frame), dur: 0.025, freq: 1500, amp: amp * 0.3, env: perc(0.0002, 190), duckable: false }); };
const keyTap = (frame, amp = 0.04) => noise({ t0: at(frame), dur: 0.025, amp, pan: 0.1, env: perc(0.0003, 170), cutoff: () => 6500, hp: 2200 });
const clap = (frame, amp = 0.22) => {
  for (const [dt, a] of [[0, 0.7], [0.01, 0.85], [0.021, 1]]) noise({ t0: at(frame) + dt, dur: 0.05, amp: amp * a, env: perc(0.0005, 65), cutoff: () => 4200, hp: 1000 });
  noise({ t0: at(frame) + 0.03, dur: 0.3, amp: amp * 0.4, env: perc(0.001, 12), cutoff: () => 3500, hp: 1200 });
};
const snare = (frame, amp = 0.15) => { noise({ t0: at(frame), dur: 0.18, amp, env: perc(0.0008, 22), cutoff: () => 6000, hp: 700 }); voice({ t0: at(frame), dur: 0.08, glide: (t) => 220 - 60 * t, amp: amp * 0.5, env: perc(0.001, 35), duckable: false }); };
const shaker = (frame, amp = 0.03, pan = 0.3) => noise({ t0: at(frame), dur: 0.07, amp, pan, env: (t) => Math.min(1, t / 0.012) * Math.exp(-t * 55), cutoff: () => 12000, hp: 6500 });
const hat = (frame, amp = 0.03, pan = -0.25) => noise({ t0: at(frame), dur: 0.04, amp, pan, env: perc(0.0005, 90), cutoff: () => 14000, hp: 8000 });
const crash = (frame, amp = 0.11, dur = 2.6) => noise({ t0: at(frame), dur, amp, env: perc(0.002, 1.4), cutoff: () => 13000, hp: 4500 });
const boom = (frame, amp = 0.35) => voice({ t0: at(frame), dur: 2, glide: (t) => 36 + 36 * Math.exp(-t * 7), amp, partials: SOFT, env: perc(0.004, 2), duckable: false });
const whoosh = (f0, f1, amp = 0.1, pan = 0) => { const t0 = at(f0), d = at(f1) - t0; noise({ t0, dur: d + 0.15, amp, pan, env: (t) => (t < d ? (t / d) ** 2 : Math.max(0, 1 - (t - d) / 0.15)), cutoff: (t) => 700 + 8000 * Math.min(1, t / d), hp: 400 }); };
const riser = (f0, f1, amp = 0.16) => { const t0 = at(f0), d = at(f1) - t0; noise({ t0, dur: d, amp, env: (t) => (t / d) ** 2.4, cutoff: (t) => 500 + 9000 * (t / d) ** 2, hp: 400 }); voice({ t0, dur: d, glide: (t) => 220 * 2 ** (2 * t / d), amp: amp * 0.12, partials: [[1, 1], [2, 0.4], [3, 0.2]], env: (t) => (t / d) ** 2 }); };
const pad = (f0, f1, notes, amp = 0.012, bright = 1) => {
  const d = at(f1) - at(f0) + 0.4;
  notes.forEach((m, k) => voice({ t0: at(f0), dur: d, freq: midi(m), amp, pan: (k / Math.max(1, notes.length - 1) - 0.5) * 0.9, partials: bright ? SOFT : [[1, 1], [2, 0.1]], detune: 0.0035, env: swell(0.5, 0.6, d) }));
};
const sub = (frame, m, len = 0.5, amp = 0.16) => voice({ t0: at(frame), dur: len + 0.05, freq: midi(m), amp, partials: [[1, 1], [2, 0.25], [3, 0.06]], env: (t) => Math.min(1, t / 0.006) * Math.min(1, Math.max(0, (len + 0.05 - t) / 0.05)) * Math.exp(-t * 1.6) });

// IV – V – iii – vi in A major
const PROG = [
  { root: 38, v: [54, 57, 61, 64] }, // Dmaj9 (F# A C# E)
  { root: 40, v: [56, 59, 61, 64] }, // E6 (G# B C# E)
  { root: 37, v: [56, 59, 64, 68] }, // C#m7 (G# B E G#)
  { root: 42, v: [57, 61, 64, 69] }, // F#m7 (A C# E A)
];
const chordAt = (f) => PROG[((Math.floor((f - DROP) / BAR) % 4) + 4) % 4];

/** The main groove: kick, clap, swung shaker, sub, piano stabs. */
function groove(f0, f1, { half = false, stabs = true, amp = 1, arp = false } = {}) {
  for (let f = f0; f < f1; f += BAR) {
    const c = chordAt(f);
    if (half) {
      kickAt(f, 0.42 * amp); snare(f + BEAT * 2, 0.07 * amp);
      kickAt(f + BEAT * 2 + S16 * 2, 0.22 * amp);
    } else {
      kickAt(f, 0.48 * amp); kickAt(f + BEAT + S16 * 2, 0.34 * amp); kickAt(f + BEAT * 2, 0.46 * amp); kickAt(f + BEAT * 3 + S16 * 3, 0.22 * amp);
      clap(f + BEAT, 0.2 * amp); clap(f + BEAT * 3, 0.2 * amp);
    }
    for (let s = 0; s < 16; s++) {
      const sw = s % 2 ? 0.9 : 0;
      shaker(f + s * S16 + sw, (s % 4 === 2 ? 0.04 : s % 2 ? 0.022 : 0.03) * amp * (half ? 0.6 : 1), s % 2 ? 0.35 : -0.15);
    }
    if (!half) for (let b = 0; b < 4; b++) hat(f + b * BEAT + BEAT / 2, 0.035 * amp);
    // sub bass: root on 1, push on the and-of-2, octave pickup
    sub(f, c.root, half ? 2.2 : 0.75, 0.17 * amp);
    if (!half) { sub(f + BEAT + S16 * 2, c.root, 0.4, 0.13 * amp); sub(f + BEAT * 2 + S16 * 2, c.root, 0.35, 0.13 * amp); sub(f + BEAT * 3 + S16 * 2, c.root + 12, 0.2, 0.1 * amp); }
    if (stabs) {
      chordP(f, c.v, 0.032 * amp, 1.6);
      if (!half) { chordP(f + BEAT + S16 * 2, c.v, 0.024 * amp, 0.7); chordP(f + BEAT * 3, c.v.map((m) => m + 12).slice(1), 0.016 * amp, 0.6); }
    }
    pad(f, f + BAR, c.v.map((m) => m - 12), 0.009 * amp, half ? 0 : 1);
    if (arp) {
      const tones = [...c.v.map((m) => m + 12), c.v[1] + 24];
      const order = [0, 2, 1, 3, 4, 3, 1, 2];
      for (let e = 0; e < 8; e++) piano(f + e * (BEAT / 2), tones[order[e]], 0.016 * amp, e % 2 ? 0.4 : -0.4, 0.9, 0.7);
    }
  }
}

// ================= 1. Hook (F# minor, tense) =================
{
  const [a, b] = S.hook, HK = cues.hook;
  // dental drill sting, short and filtered
  voice({ t0: 0, dur: 0.75, glide: (t) => 2150 + 45 * Math.sin(t * 2 * Math.PI * 55) + 120 * t, amp: 0.022, partials: [[1, 1], [2, 0.18]], env: (t) => Math.min(1, t / 0.04) * Math.min(1, (0.75 - t) / 0.12), duckable: false });
  noise({ t0: 0, dur: 0.75, amp: 0.035, env: (t) => Math.min(1, t / 0.04) * Math.min(1, (0.75 - t) / 0.12), cutoff: () => 5200, hp: 2600 });
  // heartbeat pulse
  for (let f = a + 18; f < b - 18; f += BEAT) { sub(f, 30, 0.22, 0.16); sub(f + 5, 30, 0.16, 0.09); }
  pad(a, b, [42, 49, 54, 57], 0.012, 0);
  piano(a + HK.title, 54, 0.05, -0.2, 3); piano(a + HK.title, 61, 0.035, 0.2, 3);
  for (let f = a + 36; f < HK.cost; f += BEAT / 2) hat(f, f % BEAT ? 0.016 : 0.026, 0.3);
  const POPS = [73, 76, 78, 80, 81, 83, 85];
  HK.msgs.forEach((m, i) => popUI(a + m, POPS[i], 0.04, i % 2 ? 0.35 : -0.35));
  // the cost: a dark chord and a stamp per lost patient
  chordP(a + HK.cost, [42, 54, 57, 61], 0.05, 3);
  boom(a + HK.cost, 0.22);
  HK.lost.forEach((m, i) => { kickAt(a + m, 0.2); noise({ t0: at(a + m), dur: 0.08, amp: 0.06, env: perc(0.001, 40), cutoff: () => 1800 }); mar(a + m, [61, 59, 57, 56, 54][i], 0.03, 0, 9); });
  for (let f = HK.cost + 18; f < b - BEAT * 2; f += BEAT / 2) hat(f, 0.022, 0.3);
  riser(b - 48, b - 2, 0.15);
  // snare build, accelerating, cut 2 frames before the drop for air
  for (let f = b - 36, step = S16 * 2; f < b - 2; f += step, step = Math.max(2.25, step * 0.82)) snare(f, 0.03 + 0.07 * ((f - (b - 36)) / 34));
  whoosh(b - cues.wipe, b, 0.12);
}

// ================= 2. Turn: the drop =================
{
  const [a, b] = S.turn, T = cues.turn;
  kickAt(a, 0.6); crash(a, 0.12, 3); boom(a, 0.3); clap(a, 0.16);
  sub(a, 38, 2.2, 0.2);
  chordP(a, [38, 50, 54, 57, 61, 64, 69], 0.05, 4, 0.6);
  bell(a + T.mark, 88, 0.035, 0.2);
  // half-time lift: chords on the bar, kick on 1 and 3, shaker comes in
  for (let f = a + BAR; f < b; f += BAR) { kickAt(f, 0.4); kickAt(f + BEAT * 2, 0.32); chordP(f, chordAt(f).v, 0.04, 2.4); sub(f, chordAt(f).root, 2, 0.15); pad(f, f + BAR, chordAt(f).v.map((m) => m - 12), 0.01); }
  for (let f = a + BEAT * 2; f < b; f += S16) shaker(f + ((f - a) / S16 % 2 ? 0.9 : 0), 0.022, 0.3);
  [76, 81, 85, 88].forEach((m, i) => mar(a + T.line2 + 20 + i * 4, m, 0.03, (i - 1.5) * 0.25, 9));
  // zoom-through: a reverse swell
  whoosh(b - 18, b, 0.1);
  piano(b - 18, 81, 0.02, 0, 0.6);
}

// ================= 3. Demo: full groove =================
{
  const [a, b] = S.demo, D = cues.demo;
  groove(a, b);
  crash(a, 0.07, 2);
  popUI(a + D.ask, 76, 0.045, -0.3);
  for (let k = 0; k < 7; k++) keyTap(a + D.look + 4 + k * 4.5, 0.035);
  mar(a + D.look, 88, 0.025, 0.3, 10);
  [0, 1].forEach((k) => mar(a + D.slots + k * 4.5, 85 + k * 3, 0.025, 0.35, 10));
  popUI(a + D.reply, 81, 0.05, 0.3); bell(a + D.reply + 3, 88, 0.025, 0.3);
  popUI(a + D.ask2, 78, 0.045, -0.3);
  for (let k = 0; k < 3; k++) keyTap(a + D.ask2 + 16 + k * 4.5, 0.035);
  popUI(a + D.booked, 81, 0.05, 0.3);
  // the slot fills: a bright little run
  [76, 81, 85, 88, 93].forEach((m, k) => mar(a + D.fill + k * 2.25, m, 0.035, (k - 2) * 0.2, 7));
  bell(a + D.toast, 93, 0.03, 0.35);
  whoosh(b - 18, b, 0.13, -0.3);
}

// ================= 4. Languages: groove + arp =================
{
  const [a, b] = S.langs, LG = cues.langs;
  groove(a, b, { arp: true });
  const Q = [73, 76, 78, 80, 81, 83, 85, 88, 90, 92], A = [80, 81, 85, 88, 90, 92, 93, 97, 100, 104];
  LG.cards.forEach((c, i) => { const pan = ((i % 5) - 2) * 0.2; popUI(a + c, Q[i], 0.028, pan); popUI(a + c + LG.gap, A[i] - 12, 0.032, pan); });
  bell(a + LG.chips, 88, 0.03);
  riser(b - 36, b, 0.12);
  whoosh(b - cues.wipe, b, 0.12);
}

// ================= 5. Urgent: night, half-time =================
{
  const [a, b] = S.urgent, U = cues.urgent;
  kickAt(a, 0.45); boom(a, 0.2);
  groove(a, b - BAR / 2, { half: true, stabs: false, amp: 0.85 });
  for (let f = a; f < b - BAR / 2; f += BAR) { const c = chordAt(f); piano(f, c.v[0] + 12, 0.03, -0.3, 2.2); piano(f + BEAT * 1.5, c.v[2] + 12, 0.022, 0.3, 1.6); piano(f + BEAT * 3, c.v[3] + 12, 0.02, 0, 1.2); }
  popUI(a + U.ask, 73, 0.04, 0.3);
  popUI(a + U.reply, 78, 0.04, 0.3);
  // soft two-tone alert, twice
  [0, 12].forEach((d) => { bell(a + U.alert + d, 88, 0.03, -0.2, 4); bell(a + U.alert + d + 4.5, 85, 0.028, -0.2, 4); });
  click(a + U.tap, 0.15);
  [69, 73, 76, 81].forEach((m, k) => mar(a + U.tap + 3 + k * 2.25, m, 0.04, (k - 1.5) * 0.2, 6));
  popUI(a + U.doctor, 81, 0.045, 0.3);
  // build into the end card
  riser(b - 42, b, 0.17);
  for (let f = b - BAR / 2, step = S16 * 2; f < b - 2; f += step, step = Math.max(2.25, step * 0.84)) snare(f, 0.03 + 0.08 * ((f - (b - BAR / 2)) / (BAR / 2)));
  whoosh(b - cues.wipe, b, 0.13);
}

// ================= 6. Close =================
{
  const [a, b] = S.close, CL = cues.close;
  const hit = a + CL.hit;
  // the callback line: four-on-the-floor pulse under rising chords
  kickAt(a, 0.5); crash(a, 0.08, 2);
  for (let f = a; f < hit; f += BEAT) kickAt(f, 0.3);
  chordP(a, [50, 54, 57, 61, 64], 0.04, 2.4); sub(a, 38, 1.2, 0.15);
  chordP(a + BEAT * 2, [52, 56, 59, 64], 0.04, 2.4); sub(a + BEAT * 2, 40, 1.2, 0.15);
  for (let f = a; f < hit; f += S16) shaker(f, 0.02 + 0.03 * ((f - a) / CL.hit), 0.3);
  riser(hit - 36, hit, 0.15);
  // the hit
  kickAt(hit, 0.65); clap(hit, 0.24); crash(hit, 0.14, 3.4); boom(hit, 0.3);
  chordP(hit, [33, 45, 57, 61, 64, 71, 73, 76], 0.05, 4.5, 0.5);
  sub(hit, 33, 2.4, 0.2);
  // one bar of groove in A, then the ring-out
  for (let s = 0; s < 16; s++) shaker(hit + s * S16 + (s % 2 ? 0.9 : 0), 0.026, s % 2 ? 0.35 : -0.15);
  kickAt(hit + BEAT * 2, 0.4); clap(hit + BEAT, 0.18); clap(hit + BEAT * 3, 0.18);
  const tag = [76, 81, 85, 88, 85, 81, 85, 93];
  tag.forEach((m, k) => mar(hit + 6 + k * (BEAT / 2), m, 0.04, k % 2 ? 0.3 : -0.3, 6));
  CL.chips && [0, 1, 2, 3, 4].forEach((i) => popUI(a + CL.chips + i * 3, [76, 78, 81, 85, 88][i], 0.025, (i - 2) * 0.2));
  bell(a + CL.cta, 88, 0.035); bell(a + CL.cta + 4, 93, 0.028);
  const last = hit + BAR;
  chordP(last, [38, 50, 57, 61, 64, 66, 69, 76], 0.045, at(b) - at(last) + 0.2, 0.75);
  sub(last, 33, at(b) - at(last), 0.13);
  pad(last, b, [57, 61, 64, 69], 0.012);
  bell(last + BEAT, 93, 0.025, 0.3); bell(last + BEAT * 2, 88, 0.02, -0.3);
}

// ---------- Kicks (and the duck they carve into the music) ----------
// build the duck envelope from every kick, then re-render nothing: the envelope is applied at mix time below
const duckEnv = new Float32Array(N).fill(1);
for (const [frame, amp] of kicks) {
  const s0 = Math.floor(at(frame) * SR), n = Math.floor(0.3 * SR);
  for (let j = 0; j < n && s0 + j < N; j++) { const t = j / SR; duckEnv[s0 + j] = Math.min(duckEnv[s0 + j], 1 - Math.min(0.5, amp) * Math.exp(-t / 0.09)); }
}
for (let i = 0; i < N; i++) { L[i] *= duckEnv[i]; R[i] *= duckEnv[i]; }
for (const [frame, amp] of kicks) voice({ t0: at(frame), dur: 0.38, glide: (t) => 48 + 120 * Math.exp(-t * 38), amp, env: perc(0.0015, 10), duckable: false });

// ---------- Reverb (Schroeder) ----------
function reverb(input, delaysMs, mix) {
  const out = new Float32Array(N);
  for (const ms of delaysMs) {
    const d = Math.floor((ms / 1000) * SR), buf = new Float32Array(d);
    let idx = 0, lp = 0;
    for (let i = 0; i < N; i++) {
      const y = buf[idx];
      lp = y * 0.6 + lp * 0.4;
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
  for (let i = 0; i < N; i++) input[i] = input[i] * (1 - mix * 0.35) + out[i] * mix;
}
reverb(L, [29.7, 37.1, 41.1, 43.7], 0.2);
reverb(R, [30.9, 35.3, 40.3, 45.1], 0.2);

// ---------- Master: gentle high shelf cut, fades, normalize, soft limit ----------
let pl = 0, pr = 0;
const k = 1 - Math.exp((-2 * Math.PI * 11000) / SR);
let peak = 0;
for (let i = 0; i < N; i++) {
  pl += k * (L[i] - pl); pr += k * (R[i] - pr);
  L[i] = pl; R[i] = pr;
  const t = i / SR;
  const fade = Math.min(1, t / 0.02) * Math.min(1, (SECONDS - t) / 1.4);
  L[i] *= fade; R[i] *= fade;
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const DRIVE = 1.7, norm = Math.tanh(DRIVE);
const data = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) {
  const l = (Math.tanh((L[i] / peak) * DRIVE) / norm) * 0.9;
  const r = (Math.tanh((R[i] / peak) * DRIVE) / norm) * 0.9;
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
