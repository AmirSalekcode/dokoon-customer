import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

// KAN-55 (R-01): the restaurant panel is a second entry in this repo (D-91).
const root = path.resolve(__dirname, '..');
const read = (f: string) => readFileSync(path.join(root, f), 'utf8');
const exists = (f: string) => existsSync(path.join(root, f));

describe('panel entry (panel.html)', () => {
  const html = () => read('panel.html');

  it('is Persian, RTL and marked as the restaurant app before first paint', () => {
    expect(html()).toMatch(/<html lang="fa" dir="rtl" data-app="restaurant">/);
    expect(html()).toContain("localStorage.getItem('dk-theme')");
  });

  it('is never indexed by search engines', () => {
    expect(html()).toMatch(/<meta name="robots" content="noindex, nofollow"/);
    expect(read('public-panel/robots.txt')).toMatch(/Disallow: \//);
  });

  it('boots src/panel/main.tsx with its own title and icons', () => {
    expect(html()).toContain('src="/src/panel/main.tsx"');
    expect(html()).toContain('<title>دکون رستوران</title>');
    for (const f of [
      'icon.svg',
      'icon-192.png',
      'icon-512.png',
      'icon-maskable-512.png',
      'apple-touch-icon.png',
    ])
      expect(exists(`public-panel/icons/${f}`), f).toBe(true);
  });
});

describe('vite.panel.config.ts', () => {
  const cfg = () => read('vite.panel.config.ts');

  it('builds panel.html into dist-panel with its own public dir', () => {
    expect(cfg()).toMatch(/outDir: 'dist-panel'/);
    expect(cfg()).toMatch(/publicDir: 'public-panel'/);
    expect(cfg()).toMatch(/input: .*panel\.html/);
  });

  it('has a separate PWA manifest named «دکون رستوران»', () => {
    expect(cfg()).toContain("name: 'دکون رستوران'");
    expect(cfg()).toContain("navigateFallback: '/panel.html'");
  });

  it('npm scripts for dev, mock, build, e2e and the dist secret scan exist', () => {
    const { scripts } = JSON.parse(read('package.json')) as { scripts: Record<string, string> };
    expect(scripts['dev:panel']).toBe('vite --config vite.panel.config.ts');
    expect(scripts['dev:panel:mock']).toBe('vite --config vite.panel.config.ts --mode mock');
    expect(scripts['build:panel']).toBe('tsc -b && vite build --config vite.panel.config.ts');
    expect(scripts['build:panel:mock']).toBe(
      'tsc -b && vite build --config vite.panel.config.ts --mode mock',
    );
    expect(scripts['e2e:panel']).toBe('playwright test --config playwright.panel.config.ts');
    expect(scripts['secrets:scan:dist-panel']).toBe('node scripts/secret-scan.mjs dist-panel');
  });

  it('dist-panel is never committed nor sent to the Docker build context', () => {
    expect(read('.gitignore')).toMatch(/^dist-panel\/$/m);
    expect(read('.dockerignore')).toMatch(/^dist-panel$/m);
  });
});

describe('restaurant delta tokens (design-tokens/dokoon-restaurant-tokens.css)', () => {
  const css = () => read('design-tokens/dokoon-restaurant-tokens.css');
  const block = (selector: string) => {
    const i = css().indexOf(selector + '{');
    expect(i, selector).toBeGreaterThanOrEqual(0);
    return css().slice(i, css().indexOf('}', i));
  };

  it('are scoped to [data-app="restaurant"] in light and dark', () => {
    const light = block('[data-app="restaurant"]');
    const dark = block('[data-app="restaurant"][data-theme="dark"]');
    for (const t of ['--hd', '--status-way', '--status-way-ink']) {
      expect(light, t).toContain(t + ':');
      expect(dark, t).toContain(t + ':');
    }
    for (const t of ['--status-new', '--status-prep', '--status-ready', '--status-bad', '--open-dot'])
      expect(light, t).toContain(t + ':');
  });

  it('repaint every green token of the shared library (no green in the restaurant app)', () => {
    const light = block('[data-app="restaurant"]');
    const dark = block('[data-app="restaurant"][data-theme="dark"]');
    expect(light).toContain('--success:var(--primary)');
    expect(light).toMatch(/--okbg:var\(--soft\)/);
    expect(dark).toMatch(/--okbg:var\(--soft\)/);
  });

  it('are loaded only by the panel styles', () => {
    expect(read('src/panel/styles/panel.css')).toContain('dokoon-restaurant-tokens.css');
    expect(read('src/styles/global.css')).not.toContain('restaurant');
  });
});

describe('panel Docker image', () => {
  it('Dockerfile builds either app from the APP build arg and scans the output', () => {
    const df = read('Dockerfile');
    expect(df).toMatch(/^ARG APP=customer$/m);
    expect(df).toMatch(/customer\) cfg=vite\.config\.ts; conf=docker\/nginx\.conf/);
    expect(df).toMatch(/panel\) cfg=vite\.panel\.config\.ts; conf=docker\/nginx\.panel\.conf/);
    expect(df).toMatch(/\*\) echo "APP must be customer, panel or courier/);
    expect(df).toMatch(/secret-scan\.mjs out/);
  });

  it('nginx serves the panel shell for deep links with noindex and a CSP that allows the live socket', () => {
    const conf = read('docker/nginx.panel.conf');
    expect(conf).toMatch(/index panel\.html;/);
    expect(conf).toMatch(/try_files \$uri \$uri\/ \/panel\.html;/);
    expect(conf).toMatch(/location = \/panel\.html[\s\S]*?no-cache/);
    expect(conf).toMatch(/location = \/sw\.js[\s\S]*?no-cache/);
    // add_header in a location drops the server-level ones → every location repeats noindex.
    const locations = conf.split(/\n\s*location /).length - 1;
    const robots = conf.match(/add_header X-Robots-Tag "noindex, nofollow" always;/g) ?? [];
    expect(robots.length).toBeGreaterThanOrEqual(locations);
    expect(conf).toMatch(/connect-src 'self' https: wss:/);
    expect(conf).toMatch(/frame-ancestors 'none'/);
  });

  it('docker-compose has a panel service on its own port and image', () => {
    const compose = parse(read('docker-compose.yml')) as {
      services: Record<string, { build: { args: Record<string, string> }; ports: string[]; image: string }>;
    };
    const panel = compose.services.panel;
    expect(panel.build.args.APP).toBe('panel');
    expect(panel.ports).toEqual(['8081:8080']);
    expect(panel.image).toBe('dokoon-panel:local');
    expect(compose.services.web.build.args.APP).toBe('customer');
  });
});

interface Job {
  steps: { run?: string; uses?: string; with?: Record<string, unknown> }[];
  needs?: string | string[];
  strategy?: { matrix: { include: { app: string; image: string }[] } };
}
const jobs = (f: string) => (parse(read(f)) as { jobs: Record<string, Job> }).jobs;
const runs = (j: Job) => j.steps.map((s) => s.run ?? '').join('\n');

describe('panel CI/CD', () => {
  it('quality job lints/tests once and builds + scans both apps', () => {
    const r = runs(jobs('.github/workflows/ci.yml').quality);
    expect(r).toContain('npm run build:panel');
    expect(r).toContain('npm run secrets:scan:dist-panel');
  });

  it('has a panel E2E job', () => {
    const job = jobs('.github/workflows/ci.yml')['e2e-panel'];
    expect(job).toBeDefined();
    expect(runs(job)).toContain('npm run e2e:panel');
  });

  it('docker job builds the panel image and checks its noindex header', () => {
    const r = runs(jobs('.github/workflows/ci.yml')['docker-perf']);
    expect(r).toMatch(/--build-arg APP=panel/);
    expect(r).toMatch(/X-Robots-Tag/);
  });

  it('CD pushes a separate GHCR image per app', () => {
    const job = jobs('.github/workflows/cd.yml').image;
    // The courier image (KAN-85) is checked in courier-foundation.test.ts.
    expect(job.strategy?.matrix.include).toEqual(
      expect.arrayContaining([
        { app: 'customer', image: 'web' },
        { app: 'panel', image: 'panel' },
      ]),
    );
    const build = job.steps.find((s) => s.uses?.startsWith('docker/build-push-action@'))!;
    expect(String(build.with?.['build-args'])).toMatch(/APP=\$\{\{ matrix\.app \}\}/);
    expect(String(build.with?.['cache-from'])).toMatch(/scope=\$\{\{ matrix\.app \}\}/);
  });
});
