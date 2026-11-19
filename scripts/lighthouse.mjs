// Lighthouse mobile audit of the built app (release budget: Performance ≥ 90, Accessibility ≥ 90).
//
//   npm run build:mock && npm run preview:perf      (in another terminal)
//   npm run lighthouse                               (BASE_URL defaults to http://127.0.0.1:4173)
//
// Chromium comes from Playwright (same browser as e2e) and is started with a remote-debugging
// port; Lighthouse attaches to it. This avoids chrome-launcher, which cannot spawn Chrome on some
// Windows setups. localStorage is seeded first (cookie decision, onboarding, city) so the audit
// sees what a returning user sees, and Lighthouse is told not to wipe it.
//
// The app is a single-URL SPA (stack navigation, D-17/D-18), so Lighthouse can only audit what a
// URL opens: the start page (returning user and first visit) and a shared restaurant link (D-63).
// Every other screen is covered by the k6 speed budget (perf/pages/*.js).
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import lighthouse from 'lighthouse';
import { chromium } from '@playwright/test';

export const BUDGET = { performance: 90, accessibility: 90 };

const CONSENT = { version: 1, analytics: false, decidedAt: '2026-11-18' };
const RETURNING = {
  'dk-consent': CONSENT,
  'dk-launch': { seenOnboarding: true, cityId: 'shahreza' },
};

/** Audited entry points. `seed` = localStorage before the audit (JSON values). */
export const PAGES = [
  { id: 'home', path: '/', seed: RETURNING },
  { id: 'first-visit', path: '/', seed: { 'dk-consent': CONSENT } },
  { id: 'restaurant-link', path: '/?restaurant=naghsh', seed: RETURNING },
];

/** Category scores (0–100) that are under budget. */
export function failures(scores, budget = BUDGET) {
  return Object.entries(budget)
    .filter(([k, min]) => !(typeof scores[k] === 'number' && scores[k] >= min))
    .map(([k, min]) => `${k} ${scores[k] ?? 'n/a'} < ${min}`);
}

async function main() {
  const base = (process.env.BASE_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
  const port = Number(process.env.LH_PORT || 9223);
  const outDir = path.resolve('perf/results');
  mkdirSync(outDir, { recursive: true });

  const profile = mkdtempSync(path.join(tmpdir(), 'dk-lh-'));
  const ctx = await chromium.launchPersistentContext(profile, {
    headless: true,
    args: [`--remote-debugging-port=${port}`, '--no-sandbox'],
  });

  const summary = [];
  let failed = false;
  try {
    for (const p of PAGES) {
      // Reset storage, then seed exactly this page's state.
      const seedPage = await ctx.newPage();
      // A blank same-origin page (the app itself never runs here, so it cannot overwrite the seed).
      await seedPage.route(`${base}/__lh-seed`, (r) =>
        r.fulfill({ contentType: 'text/html', body: '<!doctype html><title>seed</title>' }),
      );
      await seedPage.goto(`${base}/__lh-seed`);
      await seedPage.evaluate((seed) => {
        localStorage.clear();
        sessionStorage.clear();
        for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, JSON.stringify(v));
      }, p.seed);
      await seedPage.close();

      const res = await lighthouse(`${base}${p.path}`, {
        port,
        output: 'html',
        logLevel: 'error',
        formFactor: 'mobile',
        onlyCategories: ['performance', 'accessibility', 'best-practices'],
        disableStorageReset: true,
      });
      if (!res) throw new Error(`Lighthouse returned nothing for ${p.id}`);
      const { lhr, report } = res;
      writeFileSync(path.join(outDir, `lighthouse-${p.id}.html`), report);
      const scores = Object.fromEntries(
        Object.entries(lhr.categories).map(([k, c]) => [k, Math.round((c.score ?? 0) * 100)]),
      );
      const metrics = Object.fromEntries(
        [
          'first-contentful-paint',
          'largest-contentful-paint',
          'total-blocking-time',
          'cumulative-layout-shift',
          'speed-index',
        ].map((a) => [a, lhr.audits[a]?.displayValue ?? '']),
      );
      const fails = failures(scores);
      const failedA11y = Object.values(lhr.audits).filter(
        (a) => a.score === 0 && lhr.categories.accessibility.auditRefs.some((r) => r.id === a.id),
      );
      const a11yIssues = failedA11y.map((a) => a.id);
      const a11yDetails = failedA11y.map((a) => ({
        id: a.id,
        nodes: (a.details?.items ?? []).map((i) => ({
          selector: i.node?.selector,
          snippet: i.node?.snippet,
          explanation: i.node?.explanation,
        })),
      }));
      const shot = lhr.audits['final-screenshot']?.details?.data;
      if (typeof shot === 'string' && shot.startsWith('data:image/')) {
        const [, ext, b64] = /^data:image\/(\w+);base64,(.*)$/.exec(shot) ?? [];
        if (b64) writeFileSync(path.join(outDir, `lighthouse-${p.id}.${ext}`), Buffer.from(b64, 'base64'));
      }
      if (fails.length) failed = true;
      summary.push({ id: p.id, scores, metrics, a11yDetails, fails });
      console.log(
        `${fails.length ? '✗' : '✓'} ${p.id.padEnd(16)} ${Object.entries(scores)
          .map(([k, v]) => `${k}=${v}`)
          .join(' ')}  ${Object.entries(metrics)
          .map(([k, v]) => `${k.replace(/-/g, '_')}=${v}`)
          .join(
            ' ',
          )}${a11yIssues.length ? `  a11y: ${a11yIssues.join(',')}` : ''}${fails.length ? `  FAIL: ${fails.join('; ')}` : ''}`,
      );
    }
  } finally {
    await ctx.close();
    rmSync(profile, { recursive: true, force: true });
  }
  writeFileSync(path.join(outDir, 'lighthouse-summary.json'), JSON.stringify(summary, null, 2));
  if (failed) process.exitCode = 1;
}

// Run only as a CLI (`node scripts/lighthouse.mjs`), not when imported by its unit test.
if (process.argv[1]?.endsWith('lighthouse.mjs')) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
