#!/usr/bin/env node
// Design-system lint (`npm run lint:design`, runs in CI). Static checks for the permanent rules in
// CLAUDE.md that eslint/tsc do not cover:
//   CSS  (src/**/*.css, except the token files in src/styles/):
//     color        no hex / rgb() / hsl() / named colors — use tokens (var(--ink) …)
//     spacing      margin / padding / gap px literals above the 2px hairline — use var(--sp-*)
//     radius       border-radius px literals — use var(--r-*)
//     font-size    font-size literals — use var(--fs-*)
//     font-weight  numeric font-weight — use var(--fw-*)
//     font-family  anything but var(--font) / inherit (Yekan Bakh everywhere)
//     z-index      literals above 2 (local stacking) — use var(--z-*)
//     no-green     src/panel only: the shared green tokens (--success, --okbg) or "green"
//   TSX  (src/**/*.tsx, except tests, stories and mocks; plus src/panel/**/*.ts for no-green):
//     latin-digits ASCII digits in JSX text, text attributes or string children (Persian digits only)
//     icon-button-label  <button>/<a> with no text and no aria-label / aria-labelledby / title
//     color / font-family / spacing  the same rules for inline style objects
//     no-green     src/panel only: green tokens/words in strings, tone/variant/kind="success"
// The restaurant app has no green at all (owner rule: on = orange, off = grey). Its delta tokens also
// repaint --success/--okbg, so shared components cannot show green there either.
// Runtime checks that need a real browser (rendered digits, touch targets, font) live in
// e2e/integrity.spec.ts.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const NAMED_COLORS =
  'white|black|red|green|blue|gray|grey|orange|yellow|purple|pink|brown|silver|gold|navy|maroon|teal|lime|aqua|fuchsia|olive|cyan|magenta';
const COLOR_RE = new RegExp(
  `#[0-9a-fA-F]{3,8}\\b|\\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\\(|(?<![\\w-])(?:${NAMED_COLORS})(?![\\w-])`,
  'i',
);
const PX_RE = /(-?\d*\.?\d+)px/g;
const HAIRLINE = 2;
const SPACING_PROP = /^(?:margin|padding)(?:-[a-z-]+)?$|^(?:gap|row-gap|column-gap)$/;

const MSG = {
  color: 'hard-coded color — use a design token (var(--…))',
  spacing: 'spacing literal — use var(--sp-*) (or calc() of it)',
  radius: 'radius literal — use var(--r-*)',
  'font-size': 'font-size literal — use var(--fs-*)',
  'font-weight': 'font-weight literal — use var(--fw-*)',
  'font-family': 'font — only var(--font) (Yekan Bakh) or inherit',
  'z-index': 'z-index literal — use var(--z-*)',
  'latin-digits': 'ASCII digits in UI text — use Persian digits (toFaDigits / Intl fa-IR)',
  'icon-button-label': 'icon-only control without aria-label / aria-labelledby / title',
  'no-green': 'no green in the restaurant app — on = var(--primary), off = var(--ln)',
};

const GREEN_RE = /--(?:success|okbg)\b|\bgreen\b/i;
const TONE_ATTRS = new Set(['tone', 'variant', 'kind']);
const isPanel = (file) => file.split('\\').join('/').startsWith('src/panel/');

const issue = (file, line, rule) => ({ file, line, rule, message: MSG[rule] });
const pxOver = (value, limit) => [...value.matchAll(PX_RE)].some((m) => Math.abs(Number(m[1])) > limit);

/** Lints one CSS file. Returns [{ file, line, rule, message }]. */
export function lintCss(file, text) {
  // Blank out comments but keep newlines so line numbers stay right.
  const src = text.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));
  const out = [];
  const panel = isPanel(file);
  const decl = /(?:^|[{;\s])(--?[a-zA-Z][\w-]*|[a-z][a-z-]*)\s*:\s*([^;{}]+?)\s*(?=[;}])/g;
  for (const m of src.matchAll(decl)) {
    const prop = m[1].toLowerCase();
    const value = m[2];
    const line = src.slice(0, m.index + m[0].indexOf(m[1])).split('\n').length;
    const add = (rule) => out.push(issue(file, line, rule));
    if (COLOR_RE.test(value)) add('color');
    if (SPACING_PROP.test(prop) && pxOver(value, HAIRLINE)) add('spacing');
    if (/^border(?:-[a-z]+)*-radius$/.test(prop) && pxOver(value, 0)) add('radius');
    if (prop === 'font-size' && /\d/.test(value) && !value.includes('var(')) add('font-size');
    if (prop === 'font-weight' && /^\d+$/.test(value)) add('font-weight');
    if (prop === 'font-family' && !/^(?:var\(--font\)|inherit)$/.test(value)) add('font-family');
    if (prop === 'font' && value !== 'inherit' && !value.includes('var(--font)')) add('font-family');
    if (prop === 'z-index' && /^-?\d+$/.test(value) && Number(value) > 2) add('z-index');
    if (panel && GREEN_RE.test(value)) add('no-green');
  }
  return out;
}

const TEXT_ATTRS = new Set([
  'aria-label',
  'aria-description',
  'title',
  'placeholder',
  'alt',
  'label',
  'text',
  'subtitle',
  'hint',
  'message',
  'cta',
  'heading',
  'description',
]);
const LABEL_ATTRS = new Set(['aria-label', 'aria-labelledby', 'title']);
const STYLE_SPACING = /^(?:margin|padding)(?:[A-Z]\w*)?$|^(?:gap|rowGap|columnGap)$/;
const DIGIT = /[0-9]/;

const attrName = (a) => (ts.isJsxAttribute(a) ? a.name.getText() : null);

/** Literal text pieces of a string / template literal (interpolations excluded). */
function literalText(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isTemplateExpression(node))
    return [node.head.text, ...node.templateSpans.map((s) => s.literal.text)].join('');
  return null;
}

/** Does this JSX subtree render any text (literal or expression)? */
function hasText(children) {
  return children.some((c) => {
    if (ts.isJsxText(c)) return c.text.trim() !== '';
    if (ts.isJsxExpression(c)) return Boolean(c.expression);
    if (ts.isJsxElement(c)) return hasText([...c.children]);
    if (ts.isJsxFragment(c)) return hasText([...c.children]);
    return false;
  });
}

/** Lints one TSX file. Returns [{ file, line, rule, message }]. */
export function lintTsx(file, text) {
  const kind = file.endsWith('.ts') ? ts.ScriptKind.TS : ts.ScriptKind.TSX;
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
  const out = [];
  const panel = isPanel(file);
  const add = (node, rule) =>
    out.push(issue(file, sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1, rule));

  const visit = (node) => {
    if (panel) {
      const t = literalText(node) ?? (ts.isJsxText(node) ? node.text : null);
      if (t && GREEN_RE.test(t)) add(node, 'no-green');
      if (ts.isJsxAttribute(node) && TONE_ATTRS.has(node.name.getText()) && node.initializer) {
        const init = ts.isJsxExpression(node.initializer) ? node.initializer.expression : node.initializer;
        if (init && literalText(init) === 'success') add(node, 'no-green');
      }
    }
    if (ts.isJsxText(node) && DIGIT.test(node.text)) add(node, 'latin-digits');

    if (ts.isJsxExpression(node) && node.expression && !ts.isJsxAttribute(node.parent)) {
      const t = literalText(node.expression);
      if (t && DIGIT.test(t)) add(node, 'latin-digits');
    }

    if (ts.isJsxAttribute(node) && node.initializer) {
      const name = node.name.getText();
      const init = ts.isJsxExpression(node.initializer) ? node.initializer.expression : node.initializer;
      const t = init && literalText(init);
      if (TEXT_ATTRS.has(name) && t && DIGIT.test(t)) add(node, 'latin-digits');

      if (name === 'style' && init && ts.isObjectLiteralExpression(init)) {
        for (const p of init.properties) {
          if (!ts.isPropertyAssignment(p)) continue;
          const key = p.name.getText().replace(/['"]/g, '');
          const v = p.initializer;
          const vt = literalText(v);
          if (vt && COLOR_RE.test(vt)) add(p, 'color');
          if (key === 'fontFamily') add(p, 'font-family');
          if (STYLE_SPACING.test(key)) {
            if (ts.isNumericLiteral(v) && Number(v.text) > HAIRLINE) add(p, 'spacing');
            else if (vt && pxOver(vt, HAIRLINE)) add(p, 'spacing');
          }
        }
      }
    }

    if (ts.isJsxElement(node)) {
      const tag = node.openingElement.tagName.getText();
      if (tag === 'button' || tag === 'a') {
        const attrs = node.openingElement.attributes.properties;
        const spread = attrs.some((a) => ts.isJsxSpreadAttribute(a));
        const labelled = attrs.some((a) => LABEL_ATTRS.has(attrName(a)));
        if (!spread && !labelled && !hasText([...node.children])) add(node, 'icon-button-label');
      }
    }
    if (ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText();
      const attrs = node.attributes.properties;
      if (
        (tag === 'button' || tag === 'a') &&
        !attrs.some((a) => ts.isJsxSpreadAttribute(a) || LABEL_ATTRS.has(attrName(a)))
      )
        add(node, 'icon-button-label');
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

const SKIP_TSX = /\.(?:test|stories)\.tsx$/;
const SKIP_DIRS = [
  path.join('src', 'mocks'),
  path.join('src', 'components', 'stories'),
  path.join('src', 'styles'),
];

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

/** Lints src/ under `root`. */
export function lintRepo(root) {
  const files = walk(path.join(root, 'src')).map((f) => path.relative(root, f));
  const out = [];
  for (const f of files) {
    if (SKIP_DIRS.some((d) => f.startsWith(d + path.sep))) continue;
    const rel = f.split(path.sep).join('/');
    if (f.endsWith('.css')) out.push(...lintCss(rel, readFileSync(path.join(root, f), 'utf8')));
    else if (f.endsWith('.tsx') && !SKIP_TSX.test(f))
      out.push(...lintTsx(rel, readFileSync(path.join(root, f), 'utf8')));
    else if (isPanel(rel) && f.endsWith('.ts') && !/\.(?:test|d)\.ts$/.test(f))
      out.push(...lintTsx(rel, readFileSync(path.join(root, f), 'utf8')));
  }
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const issues = lintRepo(root);
  for (const i of issues) console.log(`${i.file}:${i.line}  ${i.rule}  ${i.message}`);
  console.log(`design lint: ${issues.length} issues`);
  process.exit(issues.length ? 1 : 0);
}
