import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

// KAN-85 (CP-01): the courier app is the third entry in this repo (D-125), served on courier.dokoonapp.ir (D-124).
const root = path.resolve(__dirname, '..');
const read = (f: string) => readFileSync(path.join(root, f), 'utf8');
const exists = (f: string) => existsSync(path.join(root, f));

describe('courier entry (courier.html)', () => {
  const html = () => read('courier.html');

  it('is Persian, RTL and marked as the courier app before first paint', () => {
    expect(html()).toMatch(/<html lang="fa" dir="rtl" data-app="courier">/);
    expect(html()).toContain("localStorage.getItem('dk-theme')");
  });

  it('is never indexed by search engines', () => {
    expect(html()).toMatch(/<meta name="robots" content="noindex, nofollow"/);
    expect(read('public-courier/robots.txt')).toMatch(/Disallow: \//);
  });

  it('boots src/courier/main.tsx with its own title and icons', () => {
    expect(html()).toContain('src="/src/courier/main.tsx"');
    expect(html()).toContain('<title>دکون پیک</title>');
    for (const f of [
      'icon.svg',
      'icon-192.png',
      'icon-512.png',
      'icon-maskable-512.png',
      'apple-touch-icon.png',
    ])
      expect(exists(`public-courier/icons/${f}`), f).toBe(true);
  });
});

describe('vite.courier.config.ts', () => {
  const cfg = () => read('vite.courier.config.ts');

  it('builds courier.html into dist-courier with its own public dir and ports', () => {
    expect(cfg()).toMatch(/outDir: 'dist-courier'/);
    expect(cfg()).toMatch(/publicDir: 'public-courier'/);
    expect(cfg()).toMatch(/input: .*courier\.html/);
    expect(cfg()).toMatch(/server: \{ port: 5177/);
    expect(cfg()).toMatch(/preview: \{ port: 4177/);
  });

  it('has a separate PWA manifest named «دکون پیک»', () => {
    expect(cfg()).toContain("name: 'دکون پیک'");
    expect(cfg()).toContain("navigateFallback: '/courier.html'");
  });

  it('npm scripts for dev, mock, build, e2e and the dist secret scan exist', () => {
    const { scripts } = JSON.parse(read('package.json')) as { scripts: Record<string, string> };
    expect(scripts['dev:courier']).toBe('vite --config vite.courier.config.ts');
    expect(scripts['dev:courier:mock']).toBe('vite --config vite.courier.config.ts --mode mock');
    expect(scripts['build:courier']).toBe('tsc -b && vite build --config vite.courier.config.ts');
    expect(scripts['build:courier:mock']).toBe(
      'tsc -b && vite build --config vite.courier.config.ts --mode mock',
    );
    expect(scripts['e2e:courier']).toBe('playwright test --config playwright.courier.config.ts');
    expect(scripts['secrets:scan:dist-courier']).toBe('node scripts/secret-scan.mjs dist-courier');
  });

  it('dist-courier is never committed, linted nor sent to the Docker build context', () => {
    expect(read('.gitignore')).toMatch(/^dist-courier\/$/m);
    expect(read('.dockerignore')).toMatch(/^dist-courier$/m);
    expect(read('.prettierignore')).toMatch(/^dist-courier$/m);
    expect(read('eslint.config.js')).toContain("'dist-courier'");
  });
});

describe('courier delta tokens (design-tokens/dokoon-courier-tokens.css)', () => {
  const css = () => read('design-tokens/dokoon-courier-tokens.css');
  const block = (selector: string) => {
    const i = css().indexOf(selector + '{');
    expect(i, selector).toBeGreaterThanOrEqual(0);
    return css().slice(i, css().indexOf('\n}', i));
  };

  it('are scoped to [data-app="courier"] in light and dark', () => {
    const light = block('[data-app="courier"]');
    const dark = block('[data-app="courier"][data-theme="dark"]');
    for (const t of [
      '--hd',
      '--hd-bg',
      '--hd-ink',
      '--alert-bg',
      '--tap-main',
      '--tap-alert',
      '--rail-w',
      '--status-ok',
      '--status-wait',
      '--status-bad',
      '--status-on',
      '--status-off',
    ])
      expect(light, t).toContain(t + ':');
    for (const t of ['--status-ok', '--status-ok-ink', '--hd-shadow']) expect(dark, t).toContain(t + ':');
  });

  it('use the courier design system values (orange gradient header, white logo, 56/64px targets)', () => {
    const light = block('[data-app="courier"]');
    expect(light).toMatch(/--hd-from:#C2410C/);
    expect(light).toMatch(/--hd-to:#E4501E/);
    expect(light).toMatch(/--alert-bg:linear-gradient\(160deg,#8B2313,#C2410C 55%,#E4501E\)/);
    expect(light).toMatch(/--tap-main:56px/);
    expect(light).toMatch(/--tap-alert:64px/);
    expect(light).toMatch(/--logo1:#FFFFFF/);
  });

  it('repaint every green token of the shared library (no green in the courier app)', () => {
    const light = block('[data-app="courier"]');
    const dark = block('[data-app="courier"][data-theme="dark"]');
    expect(light).toContain('--success:var(--primary)');
    expect(light).toMatch(/--okbg:var\(--soft\)/);
    expect(dark).toMatch(/--okbg:var\(--soft\)/);
    expect(css()).not.toMatch(/green/i);
  });

  it('are loaded only by the courier styles', () => {
    expect(read('src/courier/styles/courier.css')).toContain('dokoon-courier-tokens.css');
    expect(read('src/styles/global.css')).not.toContain('courier');
    expect(read('src/panel/styles/panel.css')).not.toContain('courier');
  });
});

describe('courier Docker image', () => {
  it('Dockerfile builds the courier app from APP=courier', () => {
    const df = read('Dockerfile');
    expect(df).toMatch(/courier\) cfg=vite\.courier\.config\.ts; conf=docker\/nginx\.courier\.conf/);
    expect(df).toMatch(/\*\) echo "APP must be customer, panel or courier/);
  });

  it('nginx serves the courier shell for deep links with noindex, geolocation and a CSP for the live socket', () => {
    const conf = read('docker/nginx.courier.conf');
    expect(conf).toMatch(/index courier\.html;/);
    expect(conf).toMatch(/try_files \$uri \$uri\/ \/courier\.html;/);
    expect(conf).toMatch(/location = \/courier\.html[\s\S]*?no-cache/);
    expect(conf).toMatch(/location = \/sw\.js[\s\S]*?no-cache/);
    const locations = conf.split(/\n\s*location /).length - 1;
    const robots = conf.match(/add_header X-Robots-Tag "noindex, nofollow" always;/g) ?? [];
    expect(robots.length).toBeGreaterThanOrEqual(locations);
    expect(conf).toMatch(/Permissions-Policy "geolocation=\(self\)/);
    expect(conf).toMatch(/connect-src 'self' https: wss:/);
    expect(conf).toMatch(/frame-ancestors 'none'/);
  });

  it('docker-compose has a courier service on its own port and image', () => {
    const compose = parse(read('docker-compose.yml')) as {
      services: Record<string, { build: { args: Record<string, string> }; ports: string[]; image: string }>;
    };
    const courier = compose.services.courier;
    expect(courier.build.args.APP).toBe('courier');
    expect(courier.ports).toEqual(['8082:8080']);
    expect(courier.image).toBe('dokoon-courier:local');
  });
});

interface Job {
  steps: { run?: string; uses?: string; with?: Record<string, unknown> }[];
  if?: string;
  strategy?: { matrix: { include: { app: string; image: string }[] } };
}
const jobs = (f: string) => (parse(read(f)) as { jobs: Record<string, Job> }).jobs;
const runs = (j: Job) => j.steps.map((s) => s.run ?? '').join('\n');

describe('courier CI/CD', () => {
  it('quality job builds and scans the courier bundle', () => {
    const r = runs(jobs('.github/workflows/ci.yml').quality);
    expect(r).toContain('npm run build:courier');
    expect(r).toContain('npm run secrets:scan:dist-courier');
  });

  it('has a courier E2E job', () => {
    const job = jobs('.github/workflows/ci.yml')['e2e-courier'];
    expect(job).toBeDefined();
    expect(runs(job)).toContain('npm run e2e:courier');
  });

  it('docker job builds the courier image and checks its noindex header', () => {
    const r = runs(jobs('.github/workflows/ci.yml')['docker-perf']);
    expect(r).toMatch(/--build-arg APP=courier/);
    expect(r).toMatch(/data-app="courier"/);
  });

  it('CD pushes a separate GHCR image for the courier app', () => {
    const job = jobs('.github/workflows/cd.yml').image;
    expect(job.strategy?.matrix.include).toContainEqual({ app: 'courier', image: 'courier' });
  });
});
