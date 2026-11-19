import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// iPhone PWA prerequisites (KAN-45). These are static checks only — the real «Add to Home Screen»
// test on an iPhone is in docs/release-checklist.md and has to be done by hand.
const root = path.resolve(__dirname, '..');
const read = (f: string) => readFileSync(path.join(root, f), 'utf8');

describe('iPhone PWA (index.html + manifest)', () => {
  const html = () => read('index.html');

  it('draws under the notch / home indicator (viewport-fit=cover) and is Persian RTL', () => {
    expect(html()).toMatch(/name="viewport"[^>]*viewport-fit=cover/);
    expect(html()).toMatch(/<html lang="fa" dir="rtl">/);
  });

  it('has the Safari home-screen tags and a 180×180 apple-touch-icon', () => {
    expect(html()).toMatch(/name="apple-mobile-web-app-capable" content="yes"/);
    expect(html()).toMatch(/name="apple-mobile-web-app-title" content="دکون"/);
    expect(html()).toMatch(/rel="apple-touch-icon" href="\/icons\/apple-touch-icon\.png"/);
    const png = readFileSync(path.join(root, 'public/icons/apple-touch-icon.png'));
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([180, 180]);
  });

  it('manifest is standalone portrait RTL with 192/512/maskable icons that exist', () => {
    const v = read('vite.config.ts');
    expect(v).toMatch(/display: 'standalone'/);
    expect(v).toMatch(/orientation: 'portrait'/);
    expect(v).toMatch(/dir: 'rtl'/);
    expect(v).toMatch(/purpose: 'maskable'/);
    for (const f of ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png']) {
      expect(existsSync(path.join(root, 'public/icons', f)), f).toBe(true);
    }
  });

  it('bars pinned to the screen edge pad for the safe area', () => {
    for (const f of [
      'src/components/library/TopBar.module.css',
      'src/components/library/Header.module.css',
      'src/components/library/ActionBar.module.css',
      'src/app/app.module.css',
    ]) {
      expect(read(f), f).toMatch(/env\(safe-area-inset-(top|bottom)\)/);
    }
  });
});
