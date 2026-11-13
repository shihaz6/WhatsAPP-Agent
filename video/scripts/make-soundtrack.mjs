// Generates public/soundtrack.wav: a calm, warm ambient bed for the Catalyst promo.
// Fully synthesized here (no samples), so there are no licensing questions.
//   Pad:   Fmaj9 - Am7 - Dm9 - Bbmaj7, slow attack, filtered, wide stereo
//   Bell:  soft 8th-note arpeggio from bar 2
//   Bass:  sine root notes
//   Beat:  very soft kick + shaker during the middle scenes only
// Usage: node scripts/make-soundtrack.mjs [seconds]

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SR = 44100;
const SECONDS = Number(process.argv[2] ?? 36);
const N = Math.round(SR * SECONDS);
const BPM = 88;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;

const L = new Float32Array(N);
const R = new Float32Array(N);

const midi = (m) => 440 * 2 ** ((m - 69) / 12);
// [root, chord tones] as MIDI notes
const CHORDS = [
  { root: 41, notes: [53, 57, 60, 64, 67] }, // Fmaj9: F A C E G
  { root: 45, notes: [52, 57, 60, 64, 67] }, // Am7:   E A C E G
  { root: 38, notes: [50, 53, 57, 60, 64] }, // Dm9:   D F A C E
  { root: 46, notes: [50, 53, 58, 62, 65] }, // Bbmaj7: D F Bb D F
];
const chordAt = (t) => CHORDS[Math.floor(t / BAR) % CHORDS.length];

// Deterministic noise so every render is identical.
let seed = 12345;
const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1;

function add(buf, i, v) { if (i >= 0 && i < N) buf[i] += v; }

// ---------- Pad: additive tones with slow swell, per chord ----------
const totalBars = Math.ceil(SECONDS / BAR);
for (let bar = 0; bar < totalBars; bar++) {
  const start = bar * BAR;
  const isLast = bar === totalBars - 1;
  const chord = isLast ? CHORDS[0] : CHORDS[bar % CHORDS.length]; // resolve home at the end
  const len = isLast ? SECONDS - start : BAR + 1.2; // overlap into next chord
  chord.notes.forEach((note, k) => {
    const f = midi(note);
    const pan = (k / (chord.notes.length - 1)) * 1.2 - 0.6;
    const detune = [0.9985, 1.0015];
    const s0 = Math.floor(start * SR), s1 = Math.min(N, Math.floor((start + len) * SR));
    for (let i = s0; i < s1; i++) {
      const t = i / SR - start;
      const attack = Math.min(1, t / 1.4);
      const release = Math.min(1, (len - t) / 1.2);
      const env = Math.max(0, Math.min(attack, release)) ** 1.6;
      const lfo = 1 + 0.004 * Math.sin(2 * Math.PI * 0.3 * (i / SR) + k);
      let v = 0;
      for (const d of detune) {
        const ph = 2 * Math.PI * f * d * lfo * (i / SR);
        v += Math.sin(ph) + 0.18 * Math.sin(2 * ph) + 0.06 * Math.sin(3 * ph);
      }
      v *= 0.032 * env;
      add(L, i, v * (1 - pan) * 0.9);
      add(R, i, v * (1 + pan) * 0.9);
    }
  });
}

// ---------- Bass ----------
for (let bar = 0; bar < totalBars; bar++) {
  const start = bar * BAR;
  const isLast = bar === totalBars - 1;
  const f = midi((isLast ? CHORDS[0] : CHORDS[bar % CHORDS.length]).root - 12 + 12);
  const len = isLast ? SECONDS - start : BAR;
  const s0 = Math.floor(start * SR), s1 = Math.min(N, Math.floor((start + len) * SR));
  for (let i = s0; i < s1; i++) {
    const t = i / SR - start;
    const env = Math.min(1, t / 0.08) * Math.min(1, (len - t) / 0.3) * (0.75 + 0.25 * Math.exp(-t * 1.5));
    const v = 0.11 * env * (Math.sin(2 * Math.PI * f * (i / SR)) + 0.15 * Math.sin(4 * Math.PI * f * (i / SR)));
    add(L, i, v); add(R, i, v);
  }
}

// ---------- Bell arpeggio (8ths) from bar 2 until the outro ----------
const ARP = [0, 2, 4, 1, 3, 4, 2, 1];
const arpEnd = SECONDS - 5;
for (let t0 = BAR, step = 0; t0 < arpEnd; t0 += BEAT / 2, step++) {
  const chord = chordAt(t0);
  const note = chord.notes[ARP[step % ARP.length]] + 12;
  const f = midi(note);
  const vel = (step % 4 === 0 ? 1 : 0.72) * Math.min(1, (t0 - BAR) / (BAR * 1.5) + 0.25);
  const pan = Math.sin(step * 0.9) * 0.5;
  const s0 = Math.floor(t0 * SR), dur = 1.6;
  for (let j = 0; j < dur * SR; j++) {
    const t = j / SR;
    const env = Math.min(1, t / 0.004) * Math.exp(-t * 3.2);
    const ph = 2 * Math.PI * f * t;
    const v = 0.045 * vel * env * (Math.sin(ph) + 0.25 * Math.sin(2.01 * ph) * Math.exp(-t * 6) + 0.08 * Math.sin(3 * ph) * Math.exp(-t * 10));
    add(L, s0 + j, v * (1 - pan));
    add(R, s0 + j, v * (1 + pan));
  }
}

// ---------- Soft beat (middle section) ----------
const beatStart = BAR * 2, beatEnd = SECONDS - BAR * 1.5;
for (let t0 = beatStart; t0 < beatEnd; t0 += BEAT) {
  const beatNo = Math.round((t0 - beatStart) / BEAT);
  const fadeIn = Math.min(1, (t0 - beatStart) / BAR);
  const fadeOut = Math.min(1, (beatEnd - t0) / BAR);
  const g = fadeIn * fadeOut;
  if (beatNo % 2 === 0) { // kick on 1 and 3
    const s0 = Math.floor(t0 * SR);
    let ph = 0;
    for (let j = 0; j < 0.35 * SR; j++) {
      const t = j / SR;
      const f = 45 + 70 * Math.exp(-t * 28);
      ph += 2 * Math.PI * f / SR;
      const v = 0.16 * g * Math.exp(-t * 9) * Math.sin(ph);
      add(L, s0 + j, v); add(R, s0 + j, v);
    }
  }
  // shaker on the off-beats
  const s1 = Math.floor((t0 + BEAT / 2) * SR);
  let lp = 0;
  for (let j = 0; j < 0.09 * SR; j++) {
    const t = j / SR;
    const n = rand();
    const hp = n - lp; lp = lp * 0.6 + n * 0.4; // crude high-pass
    const v = 0.022 * g * Math.min(1, t / 0.01) * Math.exp(-t * 40) * hp;
    add(L, s1 + j, v * 0.8); add(R, s1 + j, v * 1.2);
  }
}

// ---------- Reverb (Schroeder: 4 combs + 2 allpasses per side) ----------
function reverb(input, delaysMs, mix) {
  const out = new Float32Array(N);
  for (const ms of delaysMs) {
    const d = Math.floor((ms / 1000) * SR);
    const buf = new Float32Array(d);
    let idx = 0, lp = 0;
    for (let i = 0; i < N; i++) {
      const y = buf[idx];
      lp = y * 0.7 + lp * 0.3; // damping
      buf[idx] = input[i] + lp * 0.8;
      out[i] += y / delaysMs.length;
      idx = (idx + 1) % d;
    }
  }
  for (const ms of [5.0, 1.7]) {
    const d = Math.floor((ms / 1000) * SR);
    const buf = new Float32Array(d);
    let idx = 0;
    for (let i = 0; i < N; i++) {
      const b = buf[idx];
      const y = -0.5 * out[i] + b;
      buf[idx] = out[i] + 0.5 * y;
      out[i] = y;
      idx = (idx + 1) % d;
    }
  }
  for (let i = 0; i < N; i++) input[i] = input[i] * (1 - mix * 0.5) + out[i] * mix;
}
reverb(L, [29.7, 37.1, 41.1, 43.7], 0.42);
reverb(R, [30.9, 35.9, 40.3, 44.9], 0.42);

// ---------- Master: gentle low-pass, fades, normalize ----------
let pl = 0, pr = 0;
for (let i = 0; i < N; i++) {
  pl += (L[i] - pl) * 0.55; pr += (R[i] - pr) * 0.55;
  const t = i / SR;
  const fade = Math.min(1, t / 1.5) * Math.min(1, (SECONDS - t) / 3.5);
  L[i] = pl * fade; R[i] = pr * fade;
}
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const gain = 0.85 / peak;

// ---------- Write 16-bit stereo WAV ----------
const data = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) {
  data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * gain)) * 32767), i * 4);
  data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * gain)) * 32767), i * 4 + 2);
}
const header = Buffer.alloc(44);
header.write("RIFF", 0); header.writeUInt32LE(36 + data.length, 4); header.write("WAVE", 8);
header.write("fmt ", 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(2, 22);
header.writeUInt32LE(SR, 24); header.writeUInt32LE(SR * 4, 28); header.writeUInt16LE(4, 32); header.writeUInt16LE(16, 34);
header.write("data", 36); header.writeUInt32LE(data.length, 40);

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "soundtrack.wav");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, Buffer.concat([header, data]));
console.log(`Wrote ${out} (${SECONDS}s, peak gain ${gain.toFixed(2)})`);
