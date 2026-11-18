import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { IMPLEMENTED_SCREENS } from '@/screens/registry';

const root = path.resolve(__dirname, '..');
const read = (f: string) => readFileSync(path.join(root, f), 'utf8');

describe('k6 perf coverage (a page is not done until it has a speed test)', () => {
  it('every implemented screen has perf/pages/<screen>.js with thresholds', () => {
    expect(IMPLEMENTED_SCREENS.length).toBeGreaterThan(0);
    for (const screen of IMPLEMENTED_SCREENS) {
      const f = `perf/pages/${screen}.js`;
      expect(existsSync(path.join(root, f)), f).toBe(true);
      // Every page runs under the shared performance budget.
      expect(read(f), f).toMatch(/export const options = pageOptions\(/);
    }
  });

  it('the shared budget enforces Core Web Vitals and transition time', () => {
    const lib = read('perf/lib/page.js');
    expect(lib).toContain('pages_measured: [`count>=');
    for (const m of [
      'browser_web_vital_lcp',
      'browser_web_vital_cls',
      'browser_web_vital_fcp',
      'screen_ready',
    ]) {
      expect(lib, m).toMatch(new RegExp(`${m}: \\['p\\(\\d+\\)<`));
    }
  });

  it('seeds cookie consent with a STRING init script (k6 silently ignores function init scripts)', () => {
    const lib = read('perf/lib/page.js');
    expect(lib).not.toMatch(/addInitScript\(\s*\(\)\s*=>/);
    expect(lib).toMatch(/addInitScript\(\s*CONSENT_SEED\s*\)/);
  });

  it('static load test exists with latency and error thresholds', () => {
    const src = read('perf/static-load.js');
    expect(src).toMatch(/http_req_duration/);
    expect(src).toMatch(/http_req_failed/);
  });
});

describe('Dockerfile', () => {
  const df = () => read('Dockerfile');

  it('is multi-stage: node build → unprivileged nginx runtime', () => {
    expect(df()).toMatch(/^FROM node:\S+ AS build/m);
    expect(df()).toMatch(/^FROM nginxinc\/nginx-unprivileged:\S+/m);
    expect(df()).toMatch(/npm ci/);
  });

  it('only receives PUBLIC build args and scans the bundle for secrets', () => {
    const args = [...df().matchAll(/^ARG (\w+)/gm)].map((m) => m[1]);
    for (const a of args) expect(a, a).toMatch(/^(VITE_\w+|BUILD_MODE|NODE_VERSION)$/);
    expect(df()).toMatch(/secret-scan\.mjs dist/);
  });

  it('has a healthcheck and exposes the unprivileged port', () => {
    expect(df()).toMatch(/^HEALTHCHECK /m);
    expect(df()).toMatch(/^EXPOSE 8080/m);
  });
});

describe('nginx config (SPA + PWA caching + security headers)', () => {
  const conf = () => read('docker/nginx.conf');
  it('falls back to index.html for client-side routes', () => {
    expect(conf()).toMatch(/try_files \$uri \$uri\/ \/index\.html;/);
  });
  it('never caches index.html / sw.js; hashed assets are immutable', () => {
    expect(conf()).toMatch(/location = \/sw\.js[\s\S]*?no-cache/);
    expect(conf()).toMatch(/location = \/index\.html[\s\S]*?no-cache/);
    expect(conf()).toMatch(/location \/assets\/[\s\S]*?immutable/);
  });
  it('sends security headers', () => {
    for (const h of [
      'X-Content-Type-Options',
      'Referrer-Policy',
      'X-Frame-Options',
      'Content-Security-Policy',
    ]) {
      expect(conf(), h).toContain(h);
    }
  });
  it('compose file runs the image on port 8080', () => {
    expect(read('docker-compose.yml')).toMatch(/8080:8080/);
  });
});
