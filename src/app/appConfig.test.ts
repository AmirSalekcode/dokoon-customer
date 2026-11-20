import { describe, expect, it } from 'vitest';
import { blockFor, isOlderVersion } from './appConfig';

describe('isOlderVersion', () => {
  it('compares dotted numeric versions part by part', () => {
    expect(isOlderVersion('0.1.0', '0.2.0')).toBe(true);
    expect(isOlderVersion('0.9.9', '1.0.0')).toBe(true);
    expect(isOlderVersion('1.2.10', '1.2.9')).toBe(false);
    expect(isOlderVersion('1.2.0', '1.2.0')).toBe(false);
    expect(isOlderVersion('2.0.0', '1.9.9')).toBe(false);
  });

  it('treats missing parts as 0', () => {
    expect(isOlderVersion('1.2', '1.2.1')).toBe(true);
    expect(isOlderVersion('1.2.0', '1.2')).toBe(false);
  });

  it('never blocks on a malformed minVersion', () => {
    expect(isOlderVersion('0.1.0', 'abc')).toBe(false);
    expect(isOlderVersion('0.1.0', '')).toBe(false);
  });
});

describe('blockFor (GET /app/config at startup)', () => {
  it('no config or a normal config → nothing blocks', () => {
    expect(blockFor(undefined, '0.1.0')).toBeNull();
    expect(blockFor({ minVersion: '0.1.0', maintenance: false }, '0.1.0')).toBeNull();
  });

  it('app older than minVersion → forced update page', () => {
    expect(blockFor({ minVersion: '0.2.0' }, '0.1.0')).toBe('update');
  });

  it('maintenance → maintenance page', () => {
    expect(blockFor({ maintenance: true }, '0.1.0')).toBe('maintenance');
  });

  it('update wins over maintenance (an old app must update either way)', () => {
    expect(blockFor({ minVersion: '9.0.0', maintenance: true }, '0.1.0')).toBe('update');
  });
});
