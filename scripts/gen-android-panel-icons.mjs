// Restaurant Android app launcher icons + splash (KAN-71), rendered with headless Chromium (Playwright).
// Same look as the panel PWA icon (scripts/gen-icons.mjs, D-109): the light Dokoon mark with its orange
// accent on the dark business-header tile (--hd). Writes into android-panel/android/app/src/main/res.
// Usage: node scripts/gen-android-panel-icons.mjs
import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const res = path.join(root, 'android-panel/android/app/src/main/res');
const sprite = await readFile(path.join(root, 'src/assets/art-sprite.svg'), 'utf8');
// Raster brand assets, not UI: literal colors mirror the tokens (--hd, restaurant logo colors).
const HD = '#1F1A17';
const paths = sprite.match(/<symbol id="dk-mark"[^>]*>([\s\S]*?)<\/symbol>/)[1];
const orange = sprite.match(/<linearGradient id="gO"[\s\S]*?<\/linearGradient>/)[0];
const light =
  '<linearGradient id="gN" x1="126.54" y1="251.16" x2="126.54" y2="0" gradientUnits="userSpaceOnUse">' +
  '<stop offset=".01" stop-color="#F6EEE8"/><stop offset="1" stop-color="#E7DCD2"/></linearGradient>';

/** w×h canvas; the mark fills `mark` of the shorter side; `shape`: square | rounded | circle | none (transparent). */
function svg(w, h, mark, shape) {
  const m = Math.min(w, h) * mark;
  const bg =
    shape === 'none'
      ? ''
      : shape === 'circle'
        ? `<circle cx="${w / 2}" cy="${h / 2}" r="${Math.min(w, h) / 2}" fill="${HD}"/>`
        : `<rect width="${w}" height="${h}" rx="${shape === 'rounded' ? Math.min(w, h) * 0.22 : 0}" fill="${HD}"/>`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block">` +
    `<defs>${light}${orange}</defs>${bg}` +
    `<svg x="${(w - m) / 2}" y="${(h - m) / 2}" width="${m}" height="${m}" viewBox="0 0 253.08 251.16">${paths}</svg></svg>`
  );
}

const DENSITY = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const jobs = [];
for (const [d, k] of Object.entries(DENSITY)) {
  const launcher = Math.round(48 * k);
  jobs.push([`mipmap-${d}/ic_launcher.png`, launcher, launcher, svg(launcher, launcher, 0.6, 'rounded')]);
  jobs.push([
    `mipmap-${d}/ic_launcher_round.png`,
    launcher,
    launcher,
    svg(launcher, launcher, 0.55, 'circle'),
  ]);
  // Adaptive foreground: 108dp canvas, keep the mark inside the 66dp safe zone.
  const fg = Math.round(108 * k);
  jobs.push([`mipmap-${d}/ic_launcher_foreground.png`, fg, fg, svg(fg, fg, 0.42, 'none')]);
}
const SPLASH = {
  drawable: [480, 320],
  'drawable-land-mdpi': [480, 320],
  'drawable-land-hdpi': [800, 480],
  'drawable-land-xhdpi': [1280, 720],
  'drawable-land-xxhdpi': [1600, 960],
  'drawable-land-xxxhdpi': [1920, 1280],
  'drawable-port-mdpi': [320, 480],
  'drawable-port-hdpi': [480, 800],
  'drawable-port-xhdpi': [720, 1280],
  'drawable-port-xxhdpi': [960, 1600],
  'drawable-port-xxxhdpi': [1280, 1920],
};
for (const [d, [w, h]] of Object.entries(SPLASH))
  jobs.push([`${d}/splash.png`, w, h, svg(w, h, 0.28, 'square')]);

const browser = await chromium.launch({ args: ['--disable-gpu'] });
const page = await browser.newPage();
for (const [file, w, h, body] of jobs) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<html><body style="margin:0">${body}</body></html>`);
  await page.screenshot({ path: path.join(res, file), omitBackground: true });
  console.log('wrote', file);
}
await browser.close();
await writeFile(
  path.join(res, 'values/ic_launcher_background.xml'),
  `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${HD}</color>\n</resources>\n`,
);
