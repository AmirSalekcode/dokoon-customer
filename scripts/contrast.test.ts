import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// WCAG AA contrast (4.5:1 for normal text) for the text tokens on the surfaces they are used on.
// Lighthouse flagged --mu on --bg and --pr2 on --soft in the light theme (KAN-45, D-85).
const root = path.resolve(__dirname, '..');
const css = readFileSync(path.join(root, 'design-tokens/dokoon-tokens.css'), 'utf8');
const json = JSON.parse(readFileSync(path.join(root, 'design-tokens/dokoon-design-tokens.json'), 'utf8'));

const block = (selector: string) => {
  const i = css.indexOf(selector);
  return css.slice(i, css.indexOf('}', i));
};
const tokens = (b: string) =>
  Object.fromEntries([...b.matchAll(/--([\w-]+):\s*(#[0-9A-Fa-f]{6})/g)].map((m) => [m[1], m[2]]));

const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const PAIRS: [string, string][] = [
  ['ink', 'bg'],
  ['ink', 'sf'],
  ['mu', 'bg'],
  ['mu', 'sf'],
  ['pr2', 'bg'],
  ['pr2', 'sf'],
  ['pr2', 'soft'],
];

describe('text token contrast ≥ 4.5:1 (WCAG AA)', () => {
  for (const [theme, sel] of [
    ['light', ':root,.app{'],
    ['dark', '.app.dk,[data-theme="dark"]{'],
  ] as const) {
    it(`${theme} theme`, () => {
      const t = tokens(block(sel));
      for (const [fg, bg] of PAIRS) {
        expect(ratio(t[fg], t[bg]), `${theme} --${fg} on --${bg}`).toBeGreaterThanOrEqual(4.5);
      }
    });
  }

  it('the JSON tokens match the CSS tokens', () => {
    const light = tokens(block(':root,.app{'));
    const j = JSON.stringify(json).toUpperCase();
    expect(j).toContain(`"MUTED":"${light.mu.toUpperCase()}"`);
    expect(j).toContain(`"ACCENTTEXT":"${light.pr2.toUpperCase()}"`);
  });
});
