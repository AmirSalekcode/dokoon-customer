import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { findSecretLeaks, parseDotEnv, SECRET_PATTERNS } from './secret-scan.mjs';

const root = path.resolve(__dirname, '..');

describe('secret scanner', () => {
  it('parses .env files (comments, quotes, empty values)', () => {
    const env = parseDotEnv('# c\nA=1\nB="two words"\nC=\nexport D=x\n');
    expect(env).toEqual({ A: '1', B: 'two words', C: '', D: 'x' });
  });

  it('flags a file containing a secret value from .env', () => {
    const leaks = findSecretLeaks([{ file: 'src/x.ts', text: 'const k = "zb-123456789abc"' }], {
      ZIBAL_MERCHANT_KEY: 'zb-123456789abc',
    });
    expect(leaks).toEqual([{ file: 'src/x.ts', reason: 'value of ZIBAL_MERCHANT_KEY' }]);
  });

  it('ignores public VITE_ values and placeholders', () => {
    const leaks = findSecretLeaks([{ file: 'src/x.ts', text: 'https://api.dokoon.example/v1 CHANGE_ME' }], {
      VITE_API_BASE_URL: 'https://api.dokoon.example/v1',
      SMS_API_KEY: 'CHANGE_ME',
    });
    expect(leaks).toEqual([]);
  });

  it('flags well-known key formats even without .env', () => {
    const samples = [
      ['AI', 'zaSyA1234567890abcdefghijklmnopqrstuv'].join(''),
      ['-----BEGIN ', 'PRIVATE KEY-----'].join(''),
      ['gh', 'p_abcdefghijklmnopqrstuvwxyz0123456789'].join(''),
      ['sk_', 'live_abcdefghijklmnop1234'].join(''),
    ];
    for (const s of samples) {
      expect(findSecretLeaks([{ file: 'a.ts', text: s }], {}).length, s).toBe(1);
    }
    expect(SECRET_PATTERNS.length).toBeGreaterThan(3);
  });
});

describe('repository hygiene', () => {
  it('.env is git-ignored and .env.example is tracked', () => {
    expect(execSync('git check-ignore .env', { cwd: root }).toString().trim()).toBe('.env');
    expect(execSync('git ls-files .env.example', { cwd: root }).toString().trim()).toBe('.env.example');
  });

  it('.env.example lists every key without real values', () => {
    const example = parseDotEnv(readFileSync(path.join(root, '.env.example'), 'utf8'));
    for (const k of [
      'VITE_API_BASE_URL',
      'VITE_NESHAN_MAP_KEY',
      'VITE_BALAD_MAP_KEY',
      'ZIBAL_MERCHANT_KEY',
      'ANDROID_KEYSTORE_PASSWORD',
    ]) {
      expect(example, k).toHaveProperty(k);
    }
    for (const [k, v] of Object.entries(example)) {
      if (!k.startsWith('VITE_')) expect(v === '' || v === 'CHANGE_ME', k).toBe(true);
    }
  });

  it('source code reads env only through src/config/env.ts', () => {
    const hits = execSync(
      'git grep -l "import.meta.env" -- src ":!src/config/env.ts" ":!*.test.ts" ":!src/vite-env.d.ts"',
      {
        cwd: root,
      },
    )
      .toString()
      .trim()
      .split('\n')
      .filter(Boolean)
      // BASE_URL / DEV / MODE are Vite built-ins, not configuration.
      .filter((f) => /VITE_/.test(readFileSync(path.join(root, f), 'utf8')));
    expect(hits).toEqual([]);
  });

  it('no tracked file contains a secret', () => {
    const files = execSync('git ls-files', { cwd: root })
      .toString()
      .split('\n')
      .filter(
        (f) =>
          f &&
          !/\.(png|jpg|ttf|jar|apk|keystore)$/.test(f) &&
          !f.startsWith('prototype/') &&
          f !== 'package-lock.json',
      );
    const docs = files.map((file) => ({ file, text: readFileSync(path.join(root, file), 'utf8') }));
    let env: Record<string, string> = {};
    try {
      env = parseDotEnv(readFileSync(path.join(root, '.env'), 'utf8'));
    } catch {
      /* no local .env (CI) */
    }
    expect(findSecretLeaks(docs, env)).toEqual([]);
  });
});
