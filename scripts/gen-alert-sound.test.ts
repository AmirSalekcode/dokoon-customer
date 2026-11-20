import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs script without types
import { synth, wav } from './gen-alert-sound.mjs';

// KAN-61 / D-98: our own alert sound, at least 3 seconds, and the committed file is the generated one.
describe('new-order alert sound', () => {
  it('is ≥ 3 s, not clipped, and the committed WAV matches the generator', () => {
    const samples = synth() as Float32Array;
    expect(samples.length / 22050).toBeGreaterThanOrEqual(3);
    expect(Math.max(...samples.map(Math.abs))).toBeLessThanOrEqual(1);
    const file = readFileSync(path.resolve(__dirname, '../public-panel/sounds/new-order.wav'));
    expect(file.subarray(0, 4).toString()).toBe('RIFF');
    expect(file.equals(wav(samples))).toBe(true);
  });
});
