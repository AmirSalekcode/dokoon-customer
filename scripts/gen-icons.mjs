// Renders PWA icons with headless Chromium (Playwright).
//   public/icons        customer app: assets/logo/Asset_13.svg (navy tile)
//   public-panel/icons  restaurant panel (D-109): the bare Dokoon mark from the shared sprite, light on the
//                       dark business-header tile (--hd) — same look as the panel header, and clearly a
//                       different app from the customer icon on the same home screen.
//   public-courier/icons courier app (KAN-85): the same mark, white with a dark accent, on the orange
//                       courier-header gradient (--hd-from → --hd-to) — a third, clearly different icon.
// Usage: node scripts/gen-icons.mjs [customer|panel|courier …]   (no argument = all apps)
import { chromium } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const customerSvg = await readFile(path.join(root, 'assets/logo/Asset_13.svg'), 'utf8');
const sprite = await readFile(path.join(root, 'src/assets/art-sprite.svg'), 'utf8');
// Icons are raster/brand assets, not UI: literal colors mirror the tokens
// (--logo1 navy; panel: --hd, and the restaurant logo colors --logo1/--logo2 #F6EEE8/#E7DCD2).
const NAVY = '#172b50';
const HD = '#1F1A17';

/** Panel icon: light mark + orange accent on the dark tile. `mark` = share of the tile the mark fills. */
function panelSvg({ mark, rounded }) {
  const paths = sprite.match(/<symbol id="dk-mark"[^>]*>([\s\S]*?)<\/symbol>/)[1];
  const orange = sprite.match(/<linearGradient id="gO"[\s\S]*?<\/linearGradient>/)[0];
  const light =
    '<linearGradient id="gN" x1="126.54" y1="251.16" x2="126.54" y2="0" gradientUnits="userSpaceOnUse">' +
    '<stop offset=".01" stop-color="#F6EEE8"/><stop offset="1" stop-color="#E7DCD2"/></linearGradient>';
  const size = 128 * mark;
  const at = (128 - size) / 2;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><defs>${light}${orange}</defs>` +
    `<rect width="128" height="128" rx="${rounded ? 28 : 0}" fill="${HD}"/>` +
    `<svg x="${at}" y="${at}" width="${size}" height="${size}" viewBox="0 0 253.08 251.16">${paths}</svg></svg>\n`
  );
}

// Courier: --hd-from/--hd-to header gradient (160deg), white mark (--logo1/--logo2) and the dark tag color
// for the accent, which would vanish in orange on the orange tile.
const HD_FROM = '#C2410C';
const HD_TO = '#E4501E';
const TAG = '#1F1A17';

/** Courier icon: white mark + dark accent on the orange gradient tile. */
function courierSvg({ mark, rounded }) {
  const paths = sprite.match(/<symbol id="dk-mark"[^>]*>([\s\S]*?)<\/symbol>/)[1];
  const tile =
    '<linearGradient id="gT" x1="0.33" y1="0" x2="0.67" y2="1">' +
    `<stop offset="0" stop-color="${HD_FROM}"/><stop offset="1" stop-color="${HD_TO}"/></linearGradient>`;
  const white =
    '<linearGradient id="gN" x1="126.54" y1="251.16" x2="126.54" y2="0" gradientUnits="userSpaceOnUse">' +
    '<stop offset=".01" stop-color="#FFFFFF"/><stop offset="1" stop-color="#FFF3EA"/></linearGradient>';
  const accent = `<linearGradient id="gO"><stop offset="0" stop-color="${TAG}"/></linearGradient>`;
  const size = 128 * mark;
  const at = (128 - size) / 2;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><defs>${tile}${white}${accent}</defs>` +
    `<rect width="128" height="128" rx="${rounded ? 28 : 0}" fill="url(#gT)"/>` +
    `<svg x="${at}" y="${at}" width="${size}" height="${size}" viewBox="0 0 253.08 251.16">${paths}</svg></svg>\n`
  );
}

const customer = {
  out: 'public/icons',
  targets: [
    { file: 'icon-192.png', size: 192, pad: 0, bg: 'transparent' },
    { file: 'icon-512.png', size: 512, pad: 0, bg: 'transparent' },
    // Maskable icons need a safe zone: the mark is drawn at 80% on the brand's dark logo color.
    { file: 'icon-maskable-512.png', size: 512, pad: 0.1, bg: NAVY },
    { file: 'apple-touch-icon.png', size: 180, pad: 0, bg: NAVY },
  ],
};
const panel = {
  out: 'public-panel/icons',
  svg: panelSvg({ mark: 0.6, rounded: true }),
  targets: [
    { file: 'icon-192.png', size: 192, svg: panelSvg({ mark: 0.6, rounded: true }) },
    { file: 'icon-512.png', size: 512, svg: panelSvg({ mark: 0.6, rounded: true }) },
    // Maskable: full-bleed square, mark inside the 80% safe zone; iOS rounds the corners itself.
    { file: 'icon-maskable-512.png', size: 512, svg: panelSvg({ mark: 0.5, rounded: false }) },
    { file: 'apple-touch-icon.png', size: 180, svg: panelSvg({ mark: 0.6, rounded: false }) },
  ],
};

const courier = {
  out: 'public-courier/icons',
  svg: courierSvg({ mark: 0.6, rounded: true }),
  targets: [
    { file: 'icon-192.png', size: 192, svg: courierSvg({ mark: 0.6, rounded: true }) },
    { file: 'icon-512.png', size: 512, svg: courierSvg({ mark: 0.6, rounded: true }) },
    { file: 'icon-maskable-512.png', size: 512, svg: courierSvg({ mark: 0.5, rounded: false }) },
    { file: 'apple-touch-icon.png', size: 180, svg: courierSvg({ mark: 0.6, rounded: false }) },
  ],
};

const wanted = new Set(process.argv.slice(2));
const want = (app) => wanted.size === 0 || wanted.has(app);

const browser = await chromium.launch({ args: ['--disable-gpu'] });
const page = await browser.newPage();

async function render(file, size, html, transparent) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(html);
  await page.screenshot({ path: file, omitBackground: transparent });
}

/** Panel / courier: one SVG per target, drawn edge to edge (the tile is part of the SVG). */
async function renderTiles(app) {
  await mkdir(path.join(root, app.out), { recursive: true });
  await writeFile(path.join(root, app.out, 'icon.svg'), app.svg);
  for (const t of app.targets) {
    await render(
      path.join(root, app.out, t.file),
      t.size,
      `<html><body style="margin:0;width:${t.size}px;height:${t.size}px">${t.svg.replace('<svg ', `<svg width="${t.size}" height="${t.size}" style="display:block" `)}</body></html>`,
      true,
    );
    console.log('wrote', path.join(app.out, t.file));
  }
}

if (want('customer')) {
  await mkdir(path.join(root, customer.out), { recursive: true });
  for (const t of customer.targets) {
    const inner = Math.round(t.size * (1 - t.pad * 2));
    await render(
      path.join(root, customer.out, t.file),
      t.size,
      `<html><body style="margin:0;background:${t.bg};display:grid;place-items:center;width:${t.size}px;height:${t.size}px">` +
        `<div style="width:${inner}px;height:${inner}px">${customerSvg.replace('<svg ', '<svg width="100%" height="100%" ')}</div></body></html>`,
      t.bg === 'transparent',
    );
    console.log('wrote', path.join(customer.out, t.file));
  }
}
if (want('panel')) await renderTiles(panel);
if (want('courier')) await renderTiles(courier);
await browser.close();
