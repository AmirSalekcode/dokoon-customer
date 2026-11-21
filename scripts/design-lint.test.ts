import { execSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { lintCss, lintTsx } from './design-lint.mjs';

const root = path.resolve(__dirname, '..');
const rules = (issues: { rule: string }[]) => issues.map((i) => i.rule);

describe('design lint — CSS', () => {
  it('accepts token-only styles', () => {
    const css = `.a { color: var(--ink); background: var(--sf); padding: var(--sp-3) var(--sp-4);
      gap: 2px; border: 1.5px solid var(--ln); border-radius: var(--r-md); font-size: var(--fs-14);
      font-weight: var(--fw-bold); font: inherit; z-index: var(--z-sheet); width: 72px;
      margin: calc(-1 * var(--sp-8)) 0 0; background: transparent; color: currentColor; }`;
    expect(lintCss('x.module.css', css)).toEqual([]);
  });

  it('flags hard-coded colors (hex, rgb/hsl functions, named colors)', () => {
    const css = `.a { color: #fff; }\n.b { background: rgba(0,0,0,.2); }\n.c { border: 1px solid white; }`;
    const out = lintCss('x.module.css', css);
    expect(rules(out)).toEqual(['color', 'color', 'color']);
    expect(out.map((i) => i.line)).toEqual([1, 2, 3]);
  });

  it('flags px spacing literals above the 2px hairline (use --sp-*)', () => {
    const css = `.a { margin: 6px 0 0; }\n.b { padding: calc(48px + env(safe-area-inset-top)) 0; }\n.c { gap: 2px; padding: 1px; }`;
    expect(rules(lintCss('x.module.css', css))).toEqual(['spacing', 'spacing']);
  });

  it('flags radius, font and z-index literals', () => {
    const css = `.a { border-radius: 3px; }
      .b { font-size: 14px; font-weight: 700; font-family: Arial; }
      .c { z-index: 30; } .d { z-index: 2; } .e { border-radius: 50%; }`;
    expect(rules(lintCss('x.module.css', css))).toEqual([
      'radius',
      'font-size',
      'font-weight',
      'font-family',
      'z-index',
    ]);
  });

  it('ignores comments', () => {
    expect(lintCss('x.module.css', '/* color: #fff; margin: 9px */ .a { color: var(--ink); }')).toEqual([]);
  });
});

describe('design lint — TSX', () => {
  it('accepts Persian text, labelled icon buttons and dynamic inline styles', () => {
    const tsx = `export const A = () => (<>
      <p>سلام ۱۲</p>
      <button type="button" aria-label="بستن"><Icon name="close" /></button>
      <button type="button"><Icon name="add" />افزودن</button>
      <button type="button">{label}</button>
      <span style={{ left: \`\${x}%\` }} />
    </>);`;
    expect(lintTsx('src/x.tsx', tsx)).toEqual([]);
  });

  it('flags Latin digits in UI text and text attributes', () => {
    const tsx = `export const A = () => (<>
      <p>Order 12</p>
      <input placeholder="09xx" aria-label="کد 4 رقمی" />
      <p>{'3 روز'}</p>
    </>);`;
    expect(rules(lintTsx('src/x.tsx', tsx))).toEqual([
      'latin-digits',
      'latin-digits',
      'latin-digits',
      'latin-digits',
    ]);
  });

  it('flags an icon-only button without an accessible name', () => {
    const tsx = `export const A = () => <button type="button" onClick={f}><Icon name="close" /></button>;`;
    const out = lintTsx('src/x.tsx', tsx);
    expect(rules(out)).toEqual(['icon-button-label']);
    expect(out[0].line).toBe(1);
  });

  it('flags hard-coded colors and fonts in inline styles', () => {
    const tsx = `export const A = () => <div style={{ color: '#E4501E', fontFamily: 'Arial', padding: 12 }} />;`;
    expect(rules(lintTsx('src/x.tsx', tsx))).toEqual(['color', 'font-family', 'spacing']);
  });
});

// Restaurant app rule: no green anywhere (on = orange, off = grey). Green hex values are already
// caught by `color`; this catches the shared green tokens and the word itself.
describe('design lint — no green in the restaurant panel (src/panel)', () => {
  it('flags green tokens and named green in panel CSS', () => {
    const css = `.a { background: var(--success); }\n.b { color: var(--okbg); }\n.c { border-color: var(--ln); }`;
    const out = lintCss('src/panel/x.module.css', css);
    expect(rules(out)).toEqual(['no-green', 'no-green']);
    expect(out.map((i) => i.line)).toEqual([1, 2]);
  });

  it('flags green tokens, tones and class names in panel TSX/TS', () => {
    const tsx = `export const A = () => (<>
      <div style={{ background: 'var(--success)' }} />
      <Toast tone="success" />
      <span className="green" />
    </>);`;
    expect(rules(lintTsx('src/panel/x.tsx', tsx))).toEqual(['no-green', 'no-green', 'no-green']);
  });

  it('does not apply to the customer app', () => {
    expect(lintCss('src/screens/x.module.css', '.a { background: var(--success); }')).toEqual([]);
    expect(lintTsx('src/screens/x.tsx', '<Toast tone="success" />')).toEqual([]);
  });
});

// Courier app rule (CLAUDE.md «Courier app» 1): no green either — on = orange, off = grey.
describe('design lint — no green in the courier app (src/courier)', () => {
  it('flags green tokens and named green in courier CSS', () => {
    const css = `.a { background: var(--success); }\n.b { color: var(--okbg); }\n.c { border-color: var(--ln); }`;
    const out = lintCss('src/courier/x.module.css', css);
    expect(rules(out)).toEqual(['no-green', 'no-green']);
    expect(out.map((i) => i.line)).toEqual([1, 2]);
  });

  it('flags green tokens, tones and class names in courier TSX/TS', () => {
    const tsx = `export const A = () => (<>
      <div style={{ background: 'var(--success)' }} />
      <Toast tone="success" />
      <span className="green" />
    </>);`;
    expect(rules(lintTsx('src/courier/x.tsx', tsx))).toEqual(['no-green', 'no-green', 'no-green']);
    expect(rules(lintTsx('src/courier/state.ts', `export const tone = 'success-green';`))).toEqual([
      'no-green',
    ]);
  });
});

describe('design lint — the repo', () => {
  it('src/ passes `npm run lint:design`', () => {
    const out = execSync('node scripts/design-lint.mjs', { cwd: root, encoding: 'utf8' });
    expect(out).toMatch(/design lint: 0 issues/);
  });
});
