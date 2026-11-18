import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const root = path.resolve(__dirname, '..');
const read = (f: string) => readFileSync(path.join(root, f), 'utf8');

interface Step {
  name?: string;
  uses?: string;
  run?: string;
  with?: Record<string, unknown>;
  env?: Record<string, unknown>;
}
interface Job {
  needs?: string | string[];
  steps: Step[];
  permissions?: Record<string, string>;
}
interface Workflow {
  on: Record<string, unknown>;
  permissions?: Record<string, string>;
  jobs: Record<string, Job>;
}
const wf = (f: string) => parse(read(f)) as Workflow;
const runs = (j: Job) => j.steps.map((s) => s.run ?? '').join('\n');
const uses = (w: Workflow) =>
  Object.values(w.jobs)
    .flatMap((j) => j.steps)
    .map((s) => s.uses)
    .filter(Boolean) as string[];

describe('CI workflow (.github/workflows/ci.yml)', () => {
  const ci = () => wf('.github/workflows/ci.yml');

  it('runs on pull requests and on pushes to main', () => {
    expect(ci().on).toHaveProperty('pull_request');
    expect(JSON.stringify(ci().on.push)).toContain('main');
  });

  it('is least-privilege by default', () => {
    expect(ci().permissions).toEqual({ contents: 'read' });
  });

  it('gitleaks job may read PR commits (and nothing else extra)', () => {
    expect(ci().jobs.gitleaks.permissions).toEqual({ contents: 'read', 'pull-requests': 'read' });
  });

  it('uses current (Node 24) majors of the official actions', () => {
    const min: Record<string, number> = {
      'actions/checkout': 5,
      'actions/setup-node': 5,
      'actions/setup-java': 5,
      'actions/upload-artifact': 5,
    };
    for (const w of [ci(), wf('.github/workflows/cd.yml')]) {
      for (const u of uses(w)) {
        const [name, ver] = u.split('@');
        if (min[name]) expect(Number(ver.replace(/^v/, '')), u).toBeGreaterThanOrEqual(min[name]);
      }
    }
  });

  it('has quality, e2e, storybook, docker+k6, android and secret-scan jobs', () => {
    expect(Object.keys(ci().jobs)).toEqual(
      expect.arrayContaining(['quality', 'e2e', 'storybook', 'docker-perf', 'android', 'gitleaks']),
    );
  });

  it('quality job: install, format, lint, design lint, typecheck, unit tests, secret scans, build', () => {
    const r = runs(ci().jobs.quality);
    for (const cmd of [
      'npm ci',
      'npm run format:check',
      'npm run lint',
      'npm run lint:design',
      'npm run typecheck',
      'npm test',
      'npm run secrets:scan',
      'npm run build',
      'npm run secrets:scan:dist',
    ]) {
      expect(r, cmd).toContain(cmd);
    }
  });

  it('docker-perf job builds the image, checks health/headers and runs every k6 test', () => {
    const job = ci().jobs['docker-perf'];
    const r = runs(job);
    expect(r).toMatch(/docker build/);
    expect(r).toMatch(/healthz/);
    expect(r).toMatch(/X-Content-Type-Options/);
    expect(r).toMatch(/perf\/static-load\.js/);
    expect(r).toMatch(/perf\/pages\/\*\.js|for p in perf\/pages/);
  });

  it('android job builds the debug APK and uploads it', () => {
    const job = ci().jobs.android;
    expect(runs(job)).toMatch(/assembleDebug/);
    expect(uses(ci()).some((u) => u.startsWith('actions/upload-artifact@'))).toBe(true);
  });

  it('never references repository secrets (only the automatic GITHUB_TOKEN)', () => {
    const refs = [...read('.github/workflows/ci.yml').matchAll(/secrets\.(\w+)/g)].map((m) => m[1]);
    expect(refs.filter((r) => r !== 'GITHUB_TOKEN')).toEqual([]);
  });

  it('uses the Node version from .nvmrc everywhere', () => {
    const steps = Object.values(ci().jobs).flatMap((j) => j.steps);
    for (const s of steps.filter((x) => x.uses?.startsWith('actions/setup-node@'))) {
      expect(s.with?.['node-version-file']).toBe('.nvmrc');
    }
    expect(read('.nvmrc').trim()).toBe(read('Dockerfile').match(/ARG NODE_VERSION=(\d+)/)![1]);
  });
});

describe('CD workflow (.github/workflows/cd.yml)', () => {
  const cd = () => wf('.github/workflows/cd.yml');

  it('publishes the Docker image to GHCR on main and on version tags', () => {
    const on = JSON.stringify(cd().on);
    expect(on).toContain('main');
    expect(on).toContain('v*');
    expect(read('.github/workflows/cd.yml')).toMatch(/ghcr\.io/);
    expect(uses(cd()).some((u) => u.startsWith('docker/build-push-action@'))).toBe(true);
  });

  it('passes only public vars.VITE_* as image build args — never secrets', () => {
    const job = Object.values(cd().jobs).find((j) =>
      j.steps.some((s) => s.uses?.startsWith('docker/build-push-action@')),
    )!;
    const step = job.steps.find((s) => s.uses?.startsWith('docker/build-push-action@'))!;
    const args = String(step.with?.['build-args'] ?? '');
    expect(args).toMatch(/VITE_API_BASE_URL=\$\{\{ vars\.VITE_API_BASE_URL \}\}/);
    expect(args).not.toMatch(/secrets\./);
  });

  it('signs the release APK only on tags, with keystore secrets', () => {
    const cdText = read('.github/workflows/cd.yml');
    expect(cdText).toMatch(/ANDROID_KEYSTORE_BASE64/);
    expect(cdText).toMatch(/assembleRelease/);
  });
});

describe('repo automation', () => {
  it('has dependabot for npm, actions and docker', () => {
    const d = parse(read('.github/dependabot.yml')) as { updates: { 'package-ecosystem': string }[] };
    expect(d.updates.map((u) => u['package-ecosystem']).sort()).toEqual(['docker', 'github-actions', 'npm']);
  });

  it('has a PR template with a TDD + k6 checklist', () => {
    expect(existsSync(path.join(root, '.github/pull_request_template.md'))).toBe(true);
    const t = read('.github/pull_request_template.md');
    expect(t).toMatch(/tests? (were )?written first/i);
    expect(t).toMatch(/k6/);
  });
});

describe('test APK for phones', () => {
  const ci = wf('.github/workflows/ci.yml');
  const job = ci.jobs['test-apk-release'] as Job & { if?: string };

  it('publishes only after a merge to main, from the mock-data debug APK', () => {
    expect(job).toBeDefined();
    expect(job.if).toContain("github.ref == 'refs/heads/main'");
    expect(job.if).toContain("github.event_name == 'push'");
    expect(job.needs).toBe('android');
    expect(runs(ci.jobs.android)).toContain('npm run build:mock');
  });

  it('only this job can write releases; the workflow default stays read-only', () => {
    expect(ci.permissions).toEqual({ contents: 'read' });
    expect(job.permissions).toEqual({ contents: 'write' });
    expect(runs(job)).toContain('gh release create test-build dokoon-test.apk');
  });
});
