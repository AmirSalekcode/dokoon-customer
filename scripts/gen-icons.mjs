// Renders PWA / Android icons from assets/logo/Asset_13.svg with headless Chromium (Playwright).
// Usage: node scripts/gen-icons.mjs
import { chromium } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const svg = await readFile(path.join(root, 'assets/logo/Asset_13.svg'), 'utf8');
const out = path.join(root, 'public/icons');
await mkdir(out, { recursive: true });

// Maskable icons need a safe zone: the mark is drawn at 80% on the brand's dark logo color.
const targets = [
  { file: 'icon-192.png', size: 192, pad: 0, bg: 'transparent' },
  { file: 'icon-512.png', size: 512, pad: 0, bg: 'transparent' },
  { file: 'icon-maskable-512.png', size: 512, pad: 0.1, bg: '#172b50' },
  { file: 'apple-touch-icon.png', size: 180, pad: 0, bg: '#172b50' },
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const t of targets) {
  const inner = Math.round(t.size * (1 - t.pad * 2));
  await page.setViewportSize({ width: t.size, height: t.size });
  await page.setContent(
    `<html><body style="margin:0;background:${t.bg};display:grid;place-items:center;width:${t.size}px;height:${t.size}px">` +
      `<div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div></body></html>`,
  );
  await page.screenshot({ path: path.join(out, t.file), omitBackground: t.bg === 'transparent' });
  console.log('wrote', t.file);
}
await browser.close();
