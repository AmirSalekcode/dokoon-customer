#!/usr/bin/env node
// Generates the restaurant new-order alert (D-98): our own synthesized sound, no third-party audio,
// ≥ 3 seconds, loud and clear on phone speakers. Output: public-panel/sounds/new-order.wav
// (22.05 kHz, 16-bit mono PCM). Run: node scripts/gen-alert-sound.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RATE = 22050;
const SECONDS = 3.2;
// Two rising three-note chimes (A5 D6 G6), each note a bell: fundamental + octave partial, fast decay.
const NOTES = [
  [0.0, 880],
  [0.18, 1174.66],
  [0.36, 1567.98],
  [1.6, 880],
  [1.78, 1174.66],
  [1.96, 1567.98],
];
const NOTE_LEN = 1.1;

export function synth() {
  const n = Math.round(RATE * SECONDS);
  const out = new Float32Array(n);
  for (const [start, f] of NOTES) {
    const s0 = Math.round(start * RATE);
    const len = Math.round(NOTE_LEN * RATE);
    for (let i = 0; i < len && s0 + i < n; i++) {
      const t = i / RATE;
      const attack = Math.min(1, t / 0.005);
      const env = attack * Math.exp(-t * 4.2);
      out[s0 + i] +=
        env *
        (0.62 * Math.sin(2 * Math.PI * f * t) +
          0.28 * Math.sin(2 * Math.PI * 2 * f * t) +
          0.1 * Math.sin(2 * Math.PI * 3 * f * t));
    }
  }
  // Normalize to -1 dBFS.
  let peak = 0;
  for (const v of out) peak = Math.max(peak, Math.abs(v));
  const gain = 0.89 / (peak || 1);
  return out.map((v) => v * gain);
}

export function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((v, i) =>
    data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(v * 32767))), i * 2),
  );
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); // PCM
  h.writeUInt16LE(1, 22); // mono
  h.writeUInt32LE(RATE, 24);
  h.writeUInt32LE(RATE * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = path.join(root, 'public-panel', 'sounds');
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'new-order.wav');
  writeFileSync(file, wav(synth()));
  console.log('wrote', path.relative(root, file));
}
