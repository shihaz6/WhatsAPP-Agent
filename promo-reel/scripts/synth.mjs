// Shared sound-synthesis toolkit for the reel's audio scripts (make-audio.mjs, make-vo-mix.mjs).
// Nothing here uses samples; every sound is generated. `createSynth` returns two stereo buses
// (SFX and MUS) plus the generators that write into them, all sharing one seeded RNG so a script
// that calls them in the same order always produces the same audio.

import { writeFileSync, mkdirSync, unlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname } from "node:path";

export function createSynth(seconds, { SR = 44100, seed: seed0 = 20251121 } = {}) {
  const N = SR * seconds;
  const sfxL = new Float32Array(N), sfxR = new Float32Array(N);
  const musL = new Float32Array(N), musR = new Float32Array(N);

  let seed = seed0;
  const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1;
  const midi = (m) => 440 * 2 ** ((m - 69) / 12);
  const TAU = Math.PI * 2;

  function put(L, R, i, v, pan = 0) {
    if (i < 0 || i >= N) return;
    L[i] += v * Math.min(1, 1 - pan);
    R[i] += v * Math.min(1, 1 + pan);
  }

  // RBJ biquad
  function biquad(type, freq, q = 0.707) {
    const w0 = (TAU * freq) / SR, cs = Math.cos(w0), sn = Math.sin(w0), alpha = sn / (2 * q);
    let b0, b1, b2, a0, a1, a2;
    if (type === "lp") { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = (1 - cs) / 2; }
    else if (type === "hp") { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = (1 + cs) / 2; }
    else { b0 = alpha; b1 = 0; b2 = -alpha; } // band-pass (0 dB peak)
    a0 = 1 + alpha; a1 = -2 * cs; a2 = 1 - alpha;
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    const f = (x) => {
      const y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
      x2 = x1; x1 = x; y2 = y1; y1 = y;
      return y;
    };
    return f;
  }

  /** Render a mono generator `gen(t, j)` for `dur` seconds at `t0` into a bus. */
  function render(bus, t0, dur, gen, gain = 1, pan = 0) {
    const [L, R] = bus;
    const s0 = Math.round(t0 * SR), n = Math.round(dur * SR);
    for (let j = 0; j < n; j++) put(L, R, s0 + j, gen(j / SR, j) * gain, pan);
  }
  const SFX = [sfxL, sfxR];
  const MUS = [musL, musR];

  // ---------------------------------------------------------------- SFX
  /** Phone vibrating on a wooden table: motor hum + rattling buzz. */
  function buzz(t0, dur = 0.34, gain = 1, pan = -0.25) {
    const lp = biquad("lp", 2400), hp = biquad("hp", 90);
    const motor = 168 + rand() * 6;
    render(SFX, t0, dur + 0.05, (t) => {
      const env = Math.min(1, t / 0.012) * Math.min(1, Math.max(0, (dur - t) / 0.04));
      const ph = TAU * motor * t;
      let hum = 0;
      for (let k = 1; k <= 7; k++) hum += Math.sin(ph * k + k) / k;
      const rattle = (Math.sin(ph) > 0.55 ? 1 : 0) * rand() * 0.9; // table chatter once per cycle
      return hp(lp((hum * 0.55 + rattle) * env)) * 0.5;
    }, gain, pan);
  }

  /** Soft notification ping (generic two-note, not any OS sound). */
  function ping(t0, gain = 1, notes = [88, 95], pan = 0) {
    notes.forEach((m, k) => {
      const fr = midi(m);
      render(SFX, t0 + k * 0.075, 0.6, (t) => {
        const env = Math.min(1, t / 0.003) * Math.exp(-t * 9);
        return (Math.sin(TAU * fr * t) + 0.3 * Math.sin(TAU * fr * 2 * t) * Math.exp(-t * 20)) * env * 0.16;
      }, gain, pan);
    });
  }

  /** Phone keyboard tap. */
  function tap(t0, gain = 1) {
    const bp = biquad("bp", 3200 + rand() * 600, 1.4);
    const low = 190 + rand() * 30;
    render(SFX, t0, 0.06, (t) => {
      const env = Math.min(1, t / 0.0008) * Math.exp(-t * 140);
      return (bp(rand()) * 1.6 + Math.sin(TAU * low * t) * 0.5 * Math.exp(-t * 90)) * env * 0.5;
    }, gain, 0.2);
  }

  /** WhatsApp-like "pop" for a sent/received message (synthesized blip). */
  function pop(t0, gain = 1, up = true, pan = 0) {
    render(SFX, t0, 0.14, (t) => {
      const fr = up ? 520 + 1600 * t * 6 : 1300 - 2600 * t;
      const env = Math.min(1, t / 0.002) * Math.exp(-t * 32);
      return Math.sin(TAU * fr * t) * env * 0.35;
    }, gain, pan);
  }

  /** Clock tick (woodblock-ish). */
  function tick(t0, tock, gain = 1) {
    const fr = tock ? 1650 : 2350;
    const bp = biquad("bp", fr * 1.6, 3);
    render(SFX, t0, 0.09, (t) => {
      const env = Math.min(1, t / 0.0005) * Math.exp(-t * 75);
      return (Math.sin(TAU * fr * t) * 0.8 + bp(rand()) * 1.2) * env * 0.42;
    }, gain, tock ? 0.12 : -0.12);
  }

  /** Filtered-noise whoosh. `dur` seconds, sweeping band-pass, optional sub impact. */
  function whoosh(t0, dur, gain = 1, { from = 300, to = 3500, impact = 0, pan = 0 } = {}) {
    let bp = null, lastF = 0;
    render(SFX, t0, dur, (t) => {
      const p = t / dur;
      const fr = from * (to / from) ** Math.sin((p * Math.PI) / 2);
      if (!bp || Math.abs(fr - lastF) > 25) { bp = biquad("bp", fr, 0.9); lastF = fr; }
      const env = Math.sin(Math.PI * Math.min(1, p ** 0.7)) ** 2;
      return bp(rand()) * env * 1.1;
    }, gain, pan);
    if (impact) {
      render(SFX, t0 + dur * 0.55, 0.9, (t) => {
        const fr = 38 + 50 * Math.exp(-t * 9);
        return Math.sin(TAU * fr * t) * Math.exp(-t * 4.2) * 0.9;
      }, impact);
    }
  }

  /** Cash register: mechanical "ka" then a bright bell "ching" with coins. */
  function kaching(t0, gain = 1) {
    const bp = biquad("bp", 1800, 1.1);
    render(SFX, t0, 0.12, (t) => {
      const env = Math.min(1, t / 0.001) * Math.exp(-t * 45);
      return (bp(rand()) * 1.4 + Math.sin(TAU * (130 - 300 * t) * t) * 0.8) * env * 0.6;
    }, gain);
    const partials = [[2093, 1.0, 2.2], [2637, 0.75, 2.6], [3136, 0.55, 3.2], [4186, 0.42, 4.2], [5274, 0.28, 5.5], [6272, 0.18, 7]];
    partials.forEach(([fr, a, d], k) => {
      render(SFX, t0 + 0.075, 1.6, (t) => {
        const env = Math.min(1, t / 0.0015) * Math.exp(-t * d);
        const vib = 1 + 0.002 * Math.sin(TAU * 6 * t);
        return Math.sin(TAU * fr * vib * t + k) * a * env * 0.22;
      }, gain, k % 2 ? 0.25 : -0.25);
    });
    for (let c = 0; c < 9; c++) {
      const at = t0 + 0.12 + Math.abs(rand()) * 0.45, fr = 4200 + Math.abs(rand()) * 3000;
      render(SFX, at, 0.12, (t) => Math.sin(TAU * fr * t) * Math.exp(-t * 55) * 0.09, gain, rand() * 0.6);
    }
  }

  /** Gentle chime for the morning banner (three notes by default). */
  function chime(t0, gain = 1, notes = [[88, 0], [95, 0.11], [100, 0.22]]) {
    notes.forEach(([m, dt]) => {
      const fr = midi(m);
      render(SFX, t0 + dt, 1.4, (t) => {
        const env = Math.min(1, t / 0.004) * Math.exp(-t * 3.6);
        return (Math.sin(TAU * fr * t) + 0.25 * Math.sin(TAU * fr * 3.01 * t) * Math.exp(-t * 9)) * env * 0.15;
      }, gain, dt * 2 - 0.2);
    });
  }

  /** Very quiet night room tone (brown noise) so the cold open is never dead silent. */
  function roomTone(t0, t1, gain) {
    let b = 0;
    const lp = biquad("lp", 500);
    render(SFX, t0, t1 - t0, (t) => {
      b = (b + rand() * 0.02) * 0.995;
      const env = Math.min(1, t / 0.3) * Math.min(1, (t1 - t0 - t) / 0.8);
      return lp(b) * env;
    }, gain);
  }

  // ---------------------------------------------------------------- musical pieces
  /** 12s logo: shimmering sting, then a chord that swells into the music at `musicStart`. */
  function logoSting(bus, logoFlash, musicStart) {
    [[84, 0], [88, 0.03], [91, 0.06], [98, 0.09], [96, 0.12]].forEach(([m, dt], k) => {
      const fr = midi(m);
      render(bus, logoFlash + 0.04 + dt, 2.4, (t) => {
        const env = Math.min(1, t / 0.004) * Math.exp(-t * 1.5);
        const ph = TAU * fr * t;
        return (Math.sin(ph) + 0.35 * Math.sin(2.0 * ph) * Math.exp(-t * 4) + 0.12 * Math.sin(3.01 * ph) * Math.exp(-t * 8)) * env * 0.075;
      }, 1, k % 2 ? 0.35 : -0.35);
    });
    [60, 64, 67, 72].forEach((m, k) => {
      const fr = midi(m), t0 = logoFlash + 0.4, len = musicStart - t0 + 0.6;
      render(bus, t0, len, (t) => {
        const env = (t / len) ** 1.6 * Math.min(1, (len - t) / 0.35);
        return (Math.sin(TAU * fr * t) + 0.2 * Math.sin(TAU * fr * 2.003 * t)) * env * 0.045;
      }, 1, k % 2 ? 0.4 : -0.4);
    });
  }

  /** 14-30s: gentle music (pad + kalimba), lifts at `musicLift` (bass, beat, brighter arp). */
  function warmMusic(C, END) {
    const BPM = 120, BEAT = 60 / BPM, BAR = BEAT * 4;
    const M0 = C.musicStart, LIFT = C.musicLift;
    // bar chords (MIDI): Am7 | Fmaj7 | G6 | Cmaj7 (lift) | Am7 | Fmaj7 | G | Cmaj9
    const CH = [
      { root: 45, n: [57, 60, 64, 67] },
      { root: 41, n: [57, 60, 64, 65] },
      { root: 43, n: [55, 59, 62, 64] },
      { root: 48, n: [55, 59, 64, 67] },
      { root: 45, n: [57, 60, 64, 67] },
      { root: 41, n: [57, 60, 64, 65] },
      { root: 43, n: [55, 59, 62, 67] },
      { root: 48, n: [55, 59, 62, 64, 67] },
    ];
    const chordAt = (t) => CH[Math.min(CH.length - 1, Math.floor((t - M0) / BAR))];
    const lifted = (t) => t >= LIFT;
    const masterEnv = (t) => Math.min(1, (t - M0) / 1.6) * Math.min(1, (END - t) / 0.5);

    // Pad
    CH.forEach((ch, b) => {
      const start = M0 + b * BAR;
      const last = b === CH.length - 1;
      const len = last ? END - start : BAR + 0.9;
      ch.n.forEach((note, k) => {
        const fr = midi(note);
        const pan = (k / (ch.n.length - 1)) * 1.1 - 0.55;
        render(MUS, start, len, (t) => {
          const abs = start + t;
          const env = Math.min(1, t / 0.9) ** 1.5 * Math.min(1, (len - t) / 0.9);
          const lfo = 1 + 0.003 * Math.sin(TAU * 0.35 * abs + k);
          let v = 0;
          for (const d of [0.997, 1.003]) {
            const ph = TAU * fr * d * lfo * t;
            v += Math.sin(ph) + 0.16 * Math.sin(2 * ph) + 0.05 * Math.sin(3 * ph);
          }
          const bright = lifted(abs) ? 1.25 : 1.55; // gentle section sits a little forward on its own
          return v * env * 0.022 * bright * masterEnv(abs);
        }, 1, pan);
      });
    });

    // Kalimba arpeggio: quarters before the lift, eighths after (+ an octave sparkle)
    {
      const PAT = [0, 2, 1, 3, 2, 1, 3, 2];
      let step = 0;
      for (let t0 = M0 + BEAT * 0.5; t0 < END - 0.6; step++) {
        const ch = chordAt(t0);
        const up = lifted(t0);
        const note = ch.n[PAT[step % PAT.length] % ch.n.length] + 12 + (up && step % 4 === 3 ? 12 : 0);
        const fr = midi(note);
        const vel = (step % 2 === 0 ? 1 : 0.75) * (up ? 1 : 1.3);
        const pan = Math.sin(step * 1.3) * 0.45;
        render(MUS, t0, 1.2, (t) => {
          const env = Math.min(1, t / 0.003) * Math.exp(-t * 4.2);
          const ph = TAU * fr * t;
          return (Math.sin(ph) + 0.3 * Math.sin(2.76 * ph) * Math.exp(-t * 14) + 0.12 * Math.sin(5.4 * ph) * Math.exp(-t * 30)) * env * 0.05 * vel * masterEnv(t0 + t);
        }, 1, pan);
        t0 += up ? BEAT / 2 : BEAT;
      }
    }

    // Riser into the lift + soft impact on it
    {
      const hp = biquad("hp", 2500);
      render(MUS, LIFT - 1.4, 1.4, (t) => hp(rand()) * (t / 1.4) ** 2.2 * 0.09, 1);
      render(MUS, LIFT, 1.2, (t) => Math.sin(TAU * (45 + 40 * Math.exp(-t * 10)) * t) * Math.exp(-t * 3.5) * 0.18, 1);
    }

    // After the lift: bass, kick, clap, shaker
    for (let t0 = LIFT; t0 < END - 0.4; t0 += BEAT) {
      const beat = Math.round((t0 - LIFT) / BEAT);
      const ch = chordAt(t0);
      const g = masterEnv(t0) * Math.min(1, (END - 1.0 - t0) / 1.2 + 0.25);
      // bass (quarters, root, slightly ducked by the kick)
      const bf = midi(ch.root - 12);
      render(MUS, t0, BEAT, (t) => {
        const env = Math.min(1, t / 0.01) * Math.min(1, (BEAT - t) / 0.06) * (0.7 + 0.3 * Math.min(1, t / 0.12));
        return (Math.sin(TAU * bf * t) + 0.22 * Math.sin(TAU * bf * 2 * t)) * env * 0.12 * g;
      });
      // kick on 1 and 3
      if (beat % 2 === 0) {
        let ph = 0;
        render(MUS, t0, 0.4, (t) => {
          const fr = 48 + 90 * Math.exp(-t * 30);
          ph += (TAU * fr) / SR;
          return Math.sin(ph) * Math.exp(-t * 8) * 0.3 * g;
        });
      }
      // clap on 2 and 4
      if (beat % 2 === 1) {
        const bp = biquad("bp", 1500, 0.8);
        render(MUS, t0, 0.25, (t) => {
          const env = (Math.exp(-t * 28) + 0.6 * Math.exp(-Math.max(0, t - 0.012) * 40) * (t > 0.012 ? 1 : 0));
          return bp(rand()) * env * 0.26 * g;
        }, 1, 0.05);
      }
      // shaker on the 8ths
      for (const off of [0, BEAT / 2]) {
        const hp = biquad("hp", 6000);
        render(MUS, t0 + off, 0.08, (t) => hp(rand()) * Math.min(1, t / 0.008) * Math.exp(-t * 45) * (off ? 0.09 : 0.05) * g, 1, 0.3);
      }
    }
  }

  // ---------------------------------------------------------------- reverb
  function reverb(L, R, mix, combs = [29.7, 37.1, 41.1, 43.7]) {
    for (const [buf, spread] of [[L, 0], [R, 1.3]]) {
      const out = new Float32Array(N);
      for (const ms of combs) {
        const d = Math.floor(((ms + spread) / 1000) * SR);
        const line = new Float32Array(d);
        let idx = 0, lp = 0;
        for (let i = 0; i < N; i++) {
          const y = line[idx];
          lp = y * 0.65 + lp * 0.35;
          line[idx] = buf[i] + lp * 0.82;
          out[i] += y / combs.length;
          idx = (idx + 1) % d;
        }
      }
      for (const ms of [5.0, 1.7]) {
        const d = Math.floor((ms / 1000) * SR);
        const line = new Float32Array(d);
        let idx = 0;
        for (let i = 0; i < N; i++) {
          const b = line[idx];
          const y = -0.5 * out[i] + b;
          line[idx] = out[i] + 0.5 * y;
          out[i] = y;
          idx = (idx + 1) % d;
        }
      }
      for (let i = 0; i < N; i++) buf[i] = buf[i] * (1 - mix * 0.4) + out[i] * mix;
    }
  }

  return {
    SR, N, TAU, rand, midi, biquad, render, SFX, MUS, sfxL, sfxR, musL, musR,
    buzz, ping, tap, pop, tick, whoosh, kaching, chime, roomTone, logoSting, warmMusic, reverb,
  };
}

/** 16-bit PCM stereo WAV from two float buffers (values are clipped to [-1, 1]). */
export function wavBuffer(L, R, SR) {
  const N = L.length;
  const data = Buffer.alloc(N * 4);
  for (let i = 0; i < N; i++) {
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i])) * 32767), i * 4);
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i])) * 32767), i * 4 + 2);
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0); header.writeUInt32LE(36 + data.length, 4); header.write("WAVE", 8);
  header.write("fmt ", 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(2, 22);
  header.writeUInt32LE(SR, 24); header.writeUInt32LE(SR * 4, 28); header.writeUInt16LE(4, 32); header.writeUInt16LE(16, 34);
  header.write("data", 36); header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

/**
 * Write `raw` (a WAV buffer) to `out`, two-pass loudness-normalised to the social-video standard
 * (-14 LUFS, -1.5 dBTP). Linear mode = one fixed gain (no pumping). Returns the pass-1 stats.
 */
export function writeLoudnormWav(raw, out, target = "I=-14:TP=-1.5:LRA=11") {
  const tmp = out.replace(/\.wav$/, "-raw.wav");
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(tmp, raw);
  const pass1 = spawnSync("ffmpeg", ["-hide_banner", "-i", tmp, "-af", `loudnorm=${target}:print_format=json`, "-f", "null", "-"], { encoding: "utf8" });
  const stats = JSON.parse(pass1.stderr.slice(pass1.stderr.lastIndexOf("{"), pass1.stderr.lastIndexOf("}") + 1));
  const pass2 = spawnSync("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y", "-i", tmp,
    "-af", `loudnorm=${target}:measured_I=${stats.input_i}:measured_TP=${stats.input_tp}:measured_LRA=${stats.input_lra}:measured_thresh=${stats.input_thresh}:offset=${stats.target_offset}:linear=true,aresample=44100`,
    "-c:a", "pcm_s16le", out,
  ], { encoding: "utf8" });
  if (pass2.status !== 0) throw new Error(pass2.stderr);
  unlinkSync(tmp);
  return stats;
}
