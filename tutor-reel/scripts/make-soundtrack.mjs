// Generates the reel's audio, synced to src/cues.json. Fully synthesized, no samples.
//   public/soundtrack.wav  music + sound design (used by the video)
//   public/sfx-only.wav    sound design alone, for posting with a trending sound added in the app
// 120 BPM at 30 fps: one beat = 15 frames, one bar = 60. A minor, vi–IV–I–V (Am–F–C–G), future-house.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const cues = JSON.parse(readFileSync(join(here, "..", "src", "cues.json"), "utf8"));
const S = cues.scenes;
const SR = 44100, FPS = cues.fps, SECONDS = cues.total / FPS, N = Math.ceil(SR * SECONDS);
const BUS = { music: [new Float32Array(N), new Float32Array(N)], sfx: [new Float32Array(N), new Float32Array(N)] };
let bus = BUS.music;
const onMusic = () => (bus = BUS.music), onSfx = () => (bus = BUS.sfx);

const at = (frame) => frame / FPS;
const midi = (m) => 440 * 2 ** ((m - 69) / 12);
let seed = 7;
const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1;
function put(i, v, pan) { if (i >= 0 && i < N) { bus[0][i] += v * (1 - pan); bus[1][i] += v * (1 + pan); } }

const perc = (a, d) => (t) => Math.min(1, t / a) * Math.exp(-t * d);
const swell = (a, r, dur) => (t) => Math.max(0, Math.min(1, t / a, (dur - t) / r));
const SOFT = [[1, 1], [2, 0.28], [3, 0.1]];
const BELL = [[1, 1], [2.76, 0.22], [5.4, 0.06]];
const MAR = [[1, 1], [3.9, 0.28], [9.2, 0.05]];
const SAW = Array.from({ length: 11 }, (_, k) => [k + 1, 1 / (k + 1)]);

function voice({ t0, dur, freq = 440, glide, amp, pan = 0, partials = [[1, 1]], env, detune = 0 }) {
  const s0 = Math.floor(t0 * SR), n = Math.floor(dur * SR);
  let ph = 0, ph2 = 0;
  const nyq = SR / 2.2;
  for (let j = 0; j < n; j++) {
    const t = j / SR;
    const fr = glide ? glide(t) : freq;
    ph += (2 * Math.PI * fr) / SR;
    ph2 += (2 * Math.PI * fr * (1 + detune)) / SR;
    let v = 0;
    for (const [m, a] of partials) { if (fr * m > nyq) break; v += a * (detune ? 0.5 * (Math.sin(ph * m) + Math.sin(ph2 * m)) : Math.sin(ph * m)); }
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

// ---------- Grid ----------
const BEAT = cues.beat, BAR = BEAT * 4, S16 = BEAT / 4;
const DROP = S.turn[0];

// ---------- Instruments ----------
const clap = (frame, amp = 0.2) => {
  for (const [dt, a] of [[0, 0.7], [0.011, 0.85], [0.022, 1]]) noise({ t0: at(frame) + dt, dur: 0.05, amp: amp * a, env: perc(0.0005, 60), cutoff: () => 4400, hp: 1000 });
  noise({ t0: at(frame) + 0.03, dur: 0.35, amp: amp * 0.42, env: perc(0.001, 11), cutoff: () => 3800, hp: 1100 });
};
const snare = (frame, amp = 0.14) => { noise({ t0: at(frame), dur: 0.18, amp, env: perc(0.0008, 22), cutoff: () => 6500, hp: 700 }); voice({ t0: at(frame), dur: 0.08, glide: (t) => 230 - 60 * t, amp: amp * 0.5, env: perc(0.001, 35) }); };
const hat = (frame, amp = 0.03, pan = -0.25) => noise({ t0: at(frame), dur: 0.04, amp, pan, env: perc(0.0005, 95), cutoff: () => 15000, hp: 8000 });
const ohat = (frame, amp = 0.05, pan = 0.2) => noise({ t0: at(frame), dur: 0.22, amp, pan, env: (t) => Math.min(1, t / 0.004) * Math.exp(-t * 14), cutoff: () => 15000, hp: 7000 });
const crash = (frame, amp = 0.11, dur = 2.6) => noise({ t0: at(frame), dur, amp, env: perc(0.002, 1.3), cutoff: () => 13000, hp: 4500 });
const boom = (frame, amp = 0.35) => voice({ t0: at(frame), dur: 2, glide: (t) => 34 + 40 * Math.exp(-t * 7), amp, partials: SOFT, env: perc(0.004, 1.8) });
const whoosh = (f0, f1, amp = 0.1, pan = 0) => { const t0 = at(f0), d = at(f1) - t0; noise({ t0, dur: d + 0.18, amp, pan, env: (t) => (t < d ? (t / d) ** 2 : Math.max(0, 1 - (t - d) / 0.18)), cutoff: (t) => 600 + 9000 * Math.min(1, t / d), hp: 350 }); };
const riser = (f0, f1, amp = 0.15) => { const t0 = at(f0), d = at(f1) - t0; noise({ t0, dur: d, amp, env: (t) => (t / d) ** 2.4, cutoff: (t) => 500 + 10000 * (t / d) ** 2, hp: 400 }); voice({ t0, dur: d, glide: (t) => 220 * 2 ** (2 * t / d), amp: amp * 0.12, partials: [[1, 1], [2, 0.4], [3, 0.2]], env: (t) => (t / d) ** 2 }); };
const bell = (frame, m, amp = 0.04, pan = 0, decay = 5) => voice({ t0: at(frame), dur: 1.6, freq: midi(m), amp, pan, partials: BELL, env: perc(0.001, decay) });
const mar = (frame, m, amp = 0.05, pan = 0, decay = 8) => voice({ t0: at(frame), dur: 1, freq: midi(m), amp, pan, partials: MAR, env: perc(0.001, decay) });
const ping = (frame, m, amp = 0.05, pan = 0) => { mar(frame, m, amp, pan, 12); mar(frame + 1.5, m + 5, amp * 0.7, pan, 12); };
const pop = (frame, amp = 0.05, pan = 0) => voice({ t0: at(frame), dur: 0.09, glide: (t) => 500 + 1400 * Math.min(1, t / 0.05), amp, pan, env: perc(0.002, 40) });
const tick = (frame, amp = 0.06, m = 96, pan = 0) => { voice({ t0: at(frame), dur: 0.05, freq: midi(m), amp, pan, partials: [[1, 1], [2.3, 0.4]], env: perc(0.0004, 90) }); noise({ t0: at(frame), dur: 0.02, amp: amp * 0.5, pan, env: perc(0.0002, 200), cutoff: () => 7000, hp: 2500 }); };
const keyTap = (frame, amp = 0.05) => noise({ t0: at(frame), dur: 0.03, amp, pan: 0.1, env: perc(0.0003, 160), cutoff: () => 6500, hp: 2200 });
const thud = (frame, amp = 0.25) => { voice({ t0: at(frame), dur: 0.35, glide: (t) => 60 + 90 * Math.exp(-t * 30), amp, env: perc(0.002, 12) }); noise({ t0: at(frame), dur: 0.06, amp: amp * 0.3, env: perc(0.001, 50), cutoff: () => 2000 }); };
const buzz = (frame, dur = 0.22, amp = 0.05) => voice({ t0: at(frame), dur, freq: 155, amp, partials: [[1, 1], [2, 0.6], [3, 0.4], [5, 0.2]], env: (t) => Math.min(1, t / 0.01) * Math.min(1, (dur - t) / 0.02) * (0.6 + 0.4 * Math.sin(t * 2 * Math.PI * 28)) });

const pad = (f0, f1, notes, amp = 0.012, a = 0.4, r = 0.5) => {
  const d = at(f1) - at(f0) + r * 0.5;
  notes.forEach((m, k) => voice({ t0: at(f0), dur: d, freq: midi(m), amp, pan: (k / Math.max(1, notes.length - 1) - 0.5) * 0.9, partials: SAW.slice(0, 5), detune: 0.004, env: swell(a, r, d) }));
};
/** Detuned-saw pluck chord, the hook of a future-house track. `bright` trims the partials (a poor man's filter). */
const pluck = (frame, notes, amp = 0.02, len = 0.32, bright = 11) => notes.forEach((m, k) => voice({
  t0: at(frame), dur: len + 0.1, freq: midi(m), amp, pan: (k / Math.max(1, notes.length - 1) - 0.5) * 0.8, partials: SAW.slice(0, bright), detune: 0.006,
  env: (t) => Math.min(1, t / 0.003) * Math.exp(-t * (4 / len)),
}));
const bassNote = (frame, m, len = 0.2, amp = 0.15) => voice({ t0: at(frame), dur: len + 0.04, freq: midi(m), amp, partials: [[1, 1], [2, 0.45], [3, 0.2], [4, 0.08]], env: (t) => Math.min(1, t / 0.004) * Math.min(1, Math.max(0, (len + 0.04 - t) / 0.04)) * Math.exp(-t * 3) });
/** Vocal-chop-ish lead: a breathy formant blend with a scoop into each note. */
const chop = (frame, m, steps, amp = 0.05, pan = 0) => {
  const len = steps * S16 / FPS + 0.05, f0 = midi(m);
  voice({ t0: at(frame), dur: len + 0.12, glide: (t) => f0 * (1 - 0.06 * Math.exp(-t * 40)) * (1 + 0.006 * Math.sin(t * 2 * Math.PI * 5.5) * Math.min(1, t / 0.15)), amp, pan, partials: [[1, 1], [2, 0.55], [3, 0.42], [4, 0.12], [5, 0.18], [6, 0.05]], env: (t) => Math.min(1, t / 0.008) * Math.min(1, Math.max(0, (len + 0.12 - t) / 0.12)) * (0.8 + 0.2 * Math.exp(-t * 8)) });
  noise({ t0: at(frame), dur: 0.05, amp: amp * 0.25, pan, env: perc(0.002, 50), cutoff: () => 5000, hp: 2000 });
};

const PROG = [
  { root: 45, v: [57, 60, 64, 69] }, // Am
  { root: 41, v: [57, 60, 65, 69] }, // F
  { root: 36, v: [55, 60, 64, 67] }, // C
  { root: 43, v: [55, 59, 62, 67] }, // G
];
const chordAt = (f) => PROG[((Math.floor((f - DROP) / BAR) % 4) + 4) % 4];
const LEAD = [
  [[0, 76, 2], [3, 76, 1], [4, 79, 2], [6, 81, 3], [10, 79, 2], [12, 76, 2], [14, 74, 2]],
  [[0, 72, 2], [3, 72, 1], [4, 74, 2], [6, 76, 3], [10, 74, 2], [12, 72, 4]],
  [[0, 76, 2], [3, 76, 1], [4, 79, 2], [6, 84, 3], [10, 83, 2], [12, 79, 2], [14, 76, 2]],
  [[0, 74, 3], [4, 76, 2], [6, 74, 2], [8, 71, 5], [14, 74, 2]],
];
const leadBar = (f, amp = 0.05, oct = 0) => { const i = ((Math.floor((f - DROP) / BAR) % 4) + 4) % 4; for (const [s, m, l] of LEAD[i]) chop(f + s * S16, m + oct, l, amp, 0.1); };

// ---------- Kicks: from the same list the visuals pulse to ----------
const kicks = [...cues.kicks.hits];
for (const [a, b, step] of cues.kicks.runs) for (let f = a; f < b; f += step) kicks.push(f);

/** The groove. Kick comes from the cue list; this adds everything else. */
function groove(f0, f1, { lead = false, arp = false, plucks = true, amp = 1, leadAmp = 0.045 } = {}) {
  onMusic();
  for (let f = f0; f < f1; f += BAR) {
    const c = chordAt(f);
    clap(f + BEAT, 0.19 * amp); clap(f + BEAT * 3, 0.19 * amp);
    for (let b = 0; b < 4; b++) ohat(f + b * BEAT + BEAT / 2, 0.045 * amp);
    for (let s = 0; s < 16; s++) if (s % 2) hat(f + s * S16, 0.022 * amp, s % 4 === 3 ? 0.35 : -0.2);
    // offbeat house bass with a pickup
    for (const s of [2, 6, 10, 14]) bassNote(f + s * S16, c.root, 0.17, 0.15 * amp);
    bassNote(f + 15 * S16, c.root + 12, 0.08, 0.08 * amp);
    if (plucks) for (const s of [0, 3, 6, 10, 12]) pluck(f + s * S16, c.v, 0.016 * amp, s === 0 ? 0.42 : 0.26);
    pad(f, f + BAR, c.v.map((m) => m - 12), 0.006 * amp);
    if (lead) leadBar(f, leadAmp * amp);
    if (arp) { const t = [...c.v.map((m) => m + 12), c.v[1] + 24]; for (let e = 0; e < 16; e++) mar(f + e * S16, t[[0, 2, 1, 3, 4, 3, 1, 2][e % 8]], 0.016 * amp, e % 2 ? 0.45 : -0.45, 11); }
  }
}

// ================= 1. Hook: 11:47 PM, the phone won't stop =================
{
  const HK = cues.hook, [a, b] = S.hook;
  onMusic();
  pad(a, b + 4, [45, 57, 60, 64], 0.01, 0.2, 0.3);
  for (let f = a; f < b; f += BEAT) { bassNote(f, 33, 0.25, 0.12); }
  for (let f = a; f < b; f += BEAT) tick(f, 0.03, f % (BEAT * 2) ? 88 : 93, f % (BEAT * 2) ? 0.3 : -0.3);
  for (let f = a + BAR; f < b; f += S16 * 2) hat(f, 0.016, 0.3);
  pluck(a + 120, [57, 60, 64], 0.012, 0.3, 4); pluck(a + 135, [57, 60, 64], 0.012, 0.3, 5); pluck(a + 150, [57, 60, 64], 0.014, 0.3, 6); pluck(a + 165, [57, 60, 64], 0.016, 0.3, 7);
  onSfx();
  HK.pings.forEach((p, i) => { ping(p, 79 + (i % 6) * 2 + Math.floor(i / 12) * 2, 0.034, i % 2 ? 0.4 : -0.4); if (i % 3 === 0) buzz(p, 0.18, 0.035); });
  HK.jumps.forEach(([j], i) => thud(j, 0.18 + i * 0.02));
  riser(b - 60, b - 2, 0.12);
  whoosh(b - 10, b + 2, 0.13);
}

// ================= 2. Pain: the same questions, then silence =================
{
  const P = cues.pain, [a, b] = S.pain;
  groove(a, a + BAR, { plucks: false, amp: 0.7 });
  onMusic();
  for (const s of [0, 3, 6, 10, 12]) pluck(a + s * S16, [57, 60, 64, 69], 0.014, 0.25, 4);
  // Every. Single. Day.
  P.every.forEach((f, i) => { onMusic(); pluck(a + f, PROG[[0, 1, 3][i]].v, 0.034, 0.5); bassNote(a + f, [33, 29, 31][i], 0.4, 0.2); onSfx(); boom(a + f, 0.22); crash(a + f, 0.04, 0.8); thud(a + f, 0.2); });
  onMusic();
  // tally: three ticks, then the run into the freeze
  P.tally.forEach((f, i) => { onSfx(); pop(a + f, 0.05, (i - 1) * 0.3); mar(a + f, [81, 84, 88][i], 0.03, 0, 10); });
  onMusic();
  for (let f = a + BAR * 2; f < a + P.freeze; f += S16 * 2) snare(f, 0.04 + 0.06 * ((f - a - BAR * 2) / 30));
  pluck(a + BAR * 2, [55, 59, 62, 67], 0.02, 0.4); pluck(a + BAR * 2 + BEAT, [55, 59, 62, 67], 0.022, 0.4, 7);
  onSfx();
  riser(a + BAR * 2 - 30, a + P.freeze, 0.14);
  // the freeze: a tape-stop on the last chord, then the buzzing dies
  voice({ t0: at(a + P.freeze), dur: 0.5, glide: (t) => midi(55) * (1 - Math.min(0.85, t * 1.9)), amp: 0.05, partials: SAW.slice(0, 6), env: (t) => Math.min(1, t / 0.005) * Math.max(0, 1 - t / 0.5) });
  voice({ t0: at(a + P.freeze), dur: 0.5, glide: (t) => midi(43) * (1 - Math.min(0.85, t * 1.9)), amp: 0.08, partials: [[1, 1], [2, 0.4]], env: (t) => Math.max(0, 1 - t / 0.5) });
  buzz(a + P.freeze + 14, 0.12, 0.03);
  // a breath of near-silence, a reverse swell into the drop
  noise({ t0: at(b - 16), dur: at(16), amp: 0.08, env: (t) => (t / at(16)) ** 3, cutoff: (t) => 1500 + 9000 * (t / at(16)), hp: 500 });
}

// ================= 3. Turn: the drop =================
{
  const [a, b] = S.turn, T = cues.turn;
  onSfx(); boom(a, 0.36); crash(a, 0.14, 3); noise({ t0: at(a), dur: 0.3, amp: 0.12, env: perc(0.001, 10), cutoff: () => 8000, hp: 300 });
  onMusic();
  pluck(a, [45, 57, 60, 64, 69, 72, 76], 0.022, 1.2);
  groove(a, b, { plucks: true, amp: 0.9 });
  onSfx();
  bell(a + T.name + 8, 93, 0.035, 0.25); bell(a + T.name + 11, 100, 0.025, 0.25);
  pop(a + T.tag, 0.03);
  // bubble wipe: a swell and a swoosh up
  whoosh(b - 14, b, 0.1); pop(b - 14, 0.05); whoosh(b, b + 14, 0.08, 0.2);
}

// ================= 4. Demo: full groove + lead =================
{
  const [a, b] = S.demo, D = cues.demo;
  groove(a, b, { lead: true });
  onSfx();
  crash(a, 0.07, 2);
  ping(a + D.ask, 81, 0.04, -0.3);
  for (let f = a + D.ask + 4; f < a + D.reply; f += 7.5) tick(f, 0.018, 100, 0.4);
  ping(a + D.reply, 88, 0.05, 0.3); bell(a + D.reply + 2, 93, 0.03, 0.35);
  ping(a + D.ask2, 81, 0.04, -0.3);
  for (let f = a + D.ask2 + 4; f < a + D.reply2; f += 7.5) tick(f, 0.018, 100, 0.4);
  ping(a + D.reply2, 88, 0.05, 0.3); bell(a + D.reply2 + 2, 96, 0.03, 0.35);
  [81, 84, 88].forEach((m, i) => mar(a + D.night + 8 + i * 3.75, m, 0.03, (i - 1) * 0.3, 7));
  pop(a + D.asleep, 0.04, 0.3);
  whoosh(b - 10, b, 0.13, -0.4);
}

// ================= 5. Languages: groove + arp, lead an octave up =================
{
  const [a, b] = S.langs, LG = cues.langs;
  groove(a, b, { arp: true, lead: true, leadAmp: 0.03 });
  onSfx();
  LG.cards.forEach((c, i) => { whoosh(a + c - 6, a + c, 0.05, i % 2 ? 0.4 : -0.4); ping(a + c, 76 + i * 2, 0.03, -0.25); ping(a + c + LG.gap, 83 + i * 2, 0.035, 0.25); });
  bell(a + LG.chips, 93, 0.03);
  // shutter: slats slam shut on the cut
  whoosh(b - 11, b, 0.12); for (let i = 0; i < 4; i++) thud(b - 3 + i * 0.75, 0.06);
}

// ================= 6. Trust: breakdown, then the build =================
{
  const [a, b] = S.trust, T = cues.trust;
  onMusic();
  // bar 1: half-time, pad and the lead's first phrase, filtered
  pad(a, a + BAR, [45, 57, 60, 64], 0.012);
  for (const s of [0, 6, 12]) pluck(a + s * S16, [57, 60, 64, 69], 0.016, 0.4, 5);
  bassNote(a, 33, 1.2, 0.14);
  // bars 2–3: groove back without the lead
  groove(a + BAR, b, { amp: 0.85 });
  onSfx();
  ping(a + T.ask, 79, 0.04, -0.3);
  ping(a + T.reply, 86, 0.045, 0.3);
  bell(a + T.fwd, 88, 0.035, 0); bell(a + T.fwd + 3, 93, 0.03, 0);
  // the notification lands
  thud(a + T.notif, 0.12); ping(a + T.notif, 91, 0.05, 0); buzz(a + T.notif, 0.25, 0.04);
  // build into the offer
  onMusic();
  for (let f = b - BAR, step = S16 * 2; f < b - 1; f += step, step = Math.max(1.875, step * 0.86)) snare(f, 0.03 + 0.08 * ((f - (b - BAR)) / BAR));
  onSfx();
  riser(b - BAR, b, 0.16);
  // the flood: a deep rising wash
  noise({ t0: at(b - 20), dur: at(22), amp: 0.12, env: (t) => (t / at(22)) ** 1.5, cutoff: (t) => 300 + 2500 * (t / at(22)), hp: 80 });
}

// ================= 7. Offer: second drop =================
{
  const [a, b] = S.offer, O = cues.offer;
  onSfx(); boom(a, 0.34); crash(a, 0.14, 3);
  onMusic();
  pluck(a, [45, 57, 60, 64, 69, 72, 76], 0.022, 1);
  groove(a, b, { lead: true, arp: true, leadAmp: 0.05 });
  onSfx();
  thud(a + O.free, 0.22);
  for (let i = 0; i < 10; i++) tick(a + O.ring + i * O.ringStep, 0.05, 84 + i, (i / 9 - 0.5) * 0.6);
  bell(a + O.ring + O.ringStep * 9 + 2, 96, 0.04);
  pop(a + O.comment, 0.05);
  for (let i = 0; i < 8; i++) keyTap(a + O.type + i * 3.75, 0.07);
  const sent = a + O.type + 8 * 3.75 + 10;
  whoosh(sent - 6, sent, 0.08, 0.3); ping(sent, 88, 0.045, 0.3);
  pop(a + O.wa, 0.035);
  // into the end card: everything inhales into the tile
  riser(b - 30, b, 0.12);
}

// ================= 8. End =================
{
  const [a, b] = S.end;
  onSfx(); boom(a, 0.3); crash(a, 0.1, 3.2);
  onMusic();
  const ring = at(b) - at(a) + 0.2;
  pluck(a, [33, 45, 57, 60, 64, 69, 72, 76], 0.024, 1.6);
  pad(a, b, [57, 60, 64, 69, 76], 0.012, 0.05, 1.2);
  voice({ t0: at(a), dur: ring, freq: midi(33), amp: 0.13, partials: [[1, 1], [2, 0.3]], env: (t) => Math.min(1, t / 0.01) * Math.exp(-t * 0.9) });
  clap(a + BEAT, 0.14); clap(a + BEAT * 3, 0.12);
  [76, 81, 84, 88, 84, 88, 93].forEach((m, i) => mar(a + 14 + i * S16 * 2, m, 0.035, i % 2 ? 0.3 : -0.3, 6));
  onSfx();
  bell(a + cues.end.x + 4, 93, 0.035); bell(a + cues.end.wa, 100, 0.025, 0.3);
}

// ---------- Kicks, and the duck they carve into the music ----------
onMusic();
const duck = new Float32Array(N).fill(1);
for (const f of kicks) {
  const s0 = Math.floor(at(f) * SR), n = Math.floor(0.26 * SR);
  for (let j = 0; j < n && s0 + j < N; j++) duck[s0 + j] = Math.min(duck[s0 + j], 1 - 0.55 * Math.exp(-(j / SR) / 0.075));
}
for (const ch of BUS.music) for (let i = 0; i < N; i++) ch[i] *= duck[i];
for (const f of kicks) {
  const big = cues.kicks.hits.includes(f) || f === S.turn[0] || f === S.offer[0];
  voice({ t0: at(f), dur: 0.4, glide: (t) => 46 + 130 * Math.exp(-t * 36), amp: big ? 0.6 : 0.46, env: perc(0.0012, 9) });
  noise({ t0: at(f), dur: 0.012, amp: 0.08, env: perc(0.0002, 300), cutoff: () => 4000, hp: 1000 });
}

// ---------- Reverb (Schroeder) ----------
function reverb(input, delaysMs, mix) {
  const out = new Float32Array(N);
  for (const ms of delaysMs) {
    const d = Math.floor((ms / 1000) * SR), buf = new Float32Array(d);
    let idx = 0, lp = 0;
    for (let i = 0; i < N; i++) { const y = buf[idx]; lp = y * 0.6 + lp * 0.4; buf[idx] = input[i] + lp * 0.8; out[i] += y / delaysMs.length; idx = (idx + 1) % d; }
  }
  for (const ms of [5.0, 1.7]) {
    const d = Math.floor((ms / 1000) * SR), buf = new Float32Array(d);
    let idx = 0;
    for (let i = 0; i < N; i++) { const y = -0.5 * out[i] + buf[idx]; buf[idx] = out[i] + 0.5 * y; out[i] = y; idx = (idx + 1) % d; }
  }
  for (let i = 0; i < N; i++) input[i] = input[i] * (1 - mix * 0.35) + out[i] * mix;
}
for (const b of [BUS.music, BUS.sfx]) { reverb(b[0], [29.7, 37.1, 41.1, 43.7], 0.18); reverb(b[1], [30.9, 35.3, 40.3, 45.1], 0.18); }

// ---------- Master: high cut, fades, normalize, soft limit ----------
function master(L, R, drive, ceiling, name) {
  let pl = 0, pr = 0, peak = 1e-9;
  const k = 1 - Math.exp((-2 * Math.PI * 12500) / SR);
  for (let i = 0; i < N; i++) {
    pl += k * (L[i] - pl); pr += k * (R[i] - pr);
    const t = i / SR, fade = Math.min(1, t / 0.01) * Math.min(1, (SECONDS - t) / 1.2);
    L[i] = pl * fade; R[i] = pr * fade;
    peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  }
  const norm = Math.tanh(drive), data = Buffer.alloc(N * 4);
  for (let i = 0; i < N; i++) {
    data.writeInt16LE(Math.round((Math.tanh((L[i] / peak) * drive) / norm) * ceiling * 32767), i * 4);
    data.writeInt16LE(Math.round((Math.tanh((R[i] / peak) * drive) / norm) * ceiling * 32767), i * 4 + 2);
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0); header.writeUInt32LE(36 + data.length, 4); header.write("WAVE", 8);
  header.write("fmt ", 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(2, 22);
  header.writeUInt32LE(SR, 24); header.writeUInt32LE(SR * 4, 28); header.writeUInt16LE(4, 32); header.writeUInt16LE(16, 34);
  header.write("data", 36); header.writeUInt32LE(data.length, 40);
  const out = join(here, "..", "public", name);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, Buffer.concat([header, data]));
  return data;
}
const mixL = new Float32Array(N), mixR = new Float32Array(N);
for (let i = 0; i < N; i++) { mixL[i] = BUS.music[0][i] + BUS.sfx[0][i]; mixR[i] = BUS.music[1][i] + BUS.sfx[1][i]; }
const data = master(mixL, mixR, 1.8, 0.9, "soundtrack.wav");
master(BUS.sfx[0], BUS.sfx[1], 1.4, 0.7, "sfx-only.wav");
for (const [name, [a, b]] of Object.entries(S)) {
  let sum = 0;
  const i0 = Math.floor(at(a) * SR), i1 = Math.min(N, Math.floor(at(b) * SR));
  for (let i = i0; i < i1; i++) sum += (data.readInt16LE(i * 4) / 32767) ** 2;
  console.log(`  ${name.padEnd(6)} ${(20 * Math.log10(Math.sqrt(sum / (i1 - i0)) + 1e-9)).toFixed(1)} dBFS RMS`);
}
console.log(`Wrote public/soundtrack.wav and public/sfx-only.wav (${SECONDS.toFixed(1)}s)`);
