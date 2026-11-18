import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '..');
const read = (f: string) => readFileSync(path.join(root, f), 'utf8');
const lines = (f: string) =>
  read(f)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));

describe('.cloud/ project decisions log', () => {
  it('exists and covers every decision area', () => {
    expect(existsSync(path.join(root, '.cloud/decisions.md'))).toBe(true);
    const text = read('.cloud/decisions.md');
    for (const heading of [
      'Stack',
      'Scope',
      'Design',
      'Navigation',
      'Cart',
      'Payment',
      'Maps',
      'Push',
      'Errors',
      'API',
      'Security',
      'Workflow',
      'Open decisions',
    ]) {
      expect(text, heading).toMatch(new RegExp(`^## .*${heading}`, 'm'));
    }
  });

  it('every decision has a date and status', () => {
    const rows = read('.cloud/decisions.md')
      .split('\n')
      .filter((l) => /^\| D-\d+/.test(l));
    expect(rows.length).toBeGreaterThan(20);
    for (const r of rows) expect(r, r).toMatch(/\| 20\d\d-\d\d-\d\d \|.*\| (approved|proposed|open) \|/);
  });
});

describe('.gitignore', () => {
  it('ignores secrets, builds and tooling output but keeps env templates', () => {
    const g = lines('.gitignore');
    for (const p of [
      'node_modules/',
      'dist/',
      '.env',
      '.env.*',
      '!.env.example',
      '*.keystore',
      'coverage/',
    ]) {
      expect(g, p).toContain(p);
    }
  });
});

describe('.dockerignore', () => {
  it('keeps secrets, VCS, native shells and heavy folders out of the build context', () => {
    const d = lines('.dockerignore');
    for (const p of [
      '.env',
      '.env.*',
      '!.env.example',
      '!.env.mock',
      '.git',
      'node_modules',
      'dist',
      'android',
      'prototype',
      '*.keystore',
      '.cloud',
    ]) {
      expect(d, p).toContain(p);
    }
  });
});

describe('tracked files', () => {
  it('no generated output is tracked (k6 results, builds, test reports)', () => {
    const tracked = execSync('git ls-files', { cwd: root }).toString().split('\n');
    const generated = tracked.filter((f) =>
      /^(perf\/results|dist|dev-dist|storybook-static|test-results|playwright-report|coverage)\//.test(f),
    );
    expect(generated).toEqual([]);
  });
});
