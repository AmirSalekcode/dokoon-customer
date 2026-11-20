// Renders PWA icons from assets/logo/Asset_13.svg with headless Chromium (Playwright).
//   public/icons        customer app
//   public-panel/icons  restaurant panel: the same mark on the dark business-header tile (--hd)
// Usage: node scripts/gen-icons.mjs
import { chromium } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const svg = await readFile(path.join(root, 'assets/logo/Asset_13.svg'), 'utf8');
// Icons are raster/brand assets, not UI: literal colors mirror the tokens (--logo1 dark navy, --hd).
const NAVY = '#172b50';
const HD = '#1F1A17';

const apps = [
  {
    out: 'public/icons',
    targets: [
      { file: 'icon-192.png', size: 192, pad: 0, bg: 'transparent' },
      { file: 'icon-512.png', size: 512, pad: 0, bg: 'transparent' },
      // Maskable icons need a safe zone: the mark is drawn at 80% on the brand's dark logo color.
      { file: 'icon-maskable-512.png', size: 512, pad: 0.1, bg: NAVY },
      { file: 'apple-touch-icon.png', size: 180, pad: 0, bg: NAVY },
    ],
  },
  {
    out: 'public-panel/icons',
    svgTile: HD,
    targets: [
      { file: 'icon-192.png', size: 192, pad: 0.12, bg: HD },
      { file: 'icon-512.png', size: 512, pad: 0.12, bg: HD },
      { file: 'icon-maskable-512.png', size: 512, pad: 0.18, bg: HD },
      { file: 'apple-touch-icon.png', size: 180, pad: 0.12, bg: HD },
    ],
  },
];

/** The mark centered on a rounded tile (used for the panel's SVG favicon). */
function tiledSvg(tile) {
  const inner = svg
    .replace(/<\?xml[^>]*>\s*/, '')
    .replace('<svg ', '<svg x="14" y="14" width="100" height="100" ');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="28" fill="${tile}"/>${inner}</svg>\n`;
}

const browser = await chromium.launch({ args: ['--disable-gpu'] });
const page = await browser.newPage();
for (const app of apps) {
  const out = path.join(root, app.out);
  await mkdir(out, { recursive: true });
  if (app.svgTile) await writeFile(path.join(out, 'icon.svg'), tiledSvg(app.svgTile));
  for (const t of app.targets) {
    const inner = Math.round(t.size * (1 - t.pad * 2));
    await page.setViewportSize({ width: t.size, height: t.size });
    await page.setContent(
      `<html><body style="margin:0;background:${t.bg};display:grid;place-items:center;width:${t.size}px;height:${t.size}px">` +
        `<div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div></body></html>`,
    );
    await page.screenshot({ path: path.join(out, t.file), omitBackground: t.bg === 'transparent' });
    console.log('wrote', path.join(app.out, t.file));
  }
}
await browser.close();
