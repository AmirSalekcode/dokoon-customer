import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '..');
const file = path.join(root, '.gitleaksignore');

/**
 * .gitleaksignore silences a finding forever, so each entry must be a verified false positive:
 * an exact fingerprint (commit:file:rule:line), preceded by a "# why:" comment, for a file that is
 * not tracked today and whose flagged line holds no value.
 */
describe('.gitleaksignore', () => {
  const entries = () => {
    if (!existsSync(file)) return [];
    const lines = readFileSync(file, 'utf8').split(/\r?\n/);
    return lines
      .map((l, i) => ({ l: l.trim(), prev: (lines[i - 1] ?? '').trim() }))
      .filter((x) => x.l && !x.l.startsWith('#'));
  };

  it('every entry is an exact fingerprint with a justification', () => {
    for (const { l, prev } of entries()) {
      expect(l, l).toMatch(/^[0-9a-f]{40}:[^:]+:[a-z0-9-]+:\d+$/);
      expect(prev, `${l} needs a "# why:" comment above it`).toMatch(/^# why: .{20,}/);
    }
  });

  // CI checks out a shallow clone, so old commits may be missing; verify history only when it exists.
  const hasObject = (ref: string) => {
    try {
      execSync(`git cat-file -e ${ref}`, { cwd: root, stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  };

  it('ignored findings point at files that are not tracked anymore and at empty values', () => {
    for (const { l } of entries()) {
      const [commit, f, , line] = l.split(':');
      expect(execSync(`git ls-files -- "${f}"`, { cwd: root }).toString().trim(), f).toBe('');
      if (!hasObject(`${commit}:${f}`)) continue; // shallow clone: history not available
      const text = execSync(`git show ${commit}:${f}`, { cwd: root }).toString().split('\n');
      // The flagged line must have an empty value (KEY=), i.e. nothing that could be a secret.
      expect(text[Number(line) - 1], `${f}:${line}`).toMatch(/^[A-Z0-9_]+=\s*$/);
    }
  });
});
