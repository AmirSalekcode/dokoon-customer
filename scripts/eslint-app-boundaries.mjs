// ESLint rule `dokoon/app-boundaries` (decisions D-91, D-125): the customer app, the restaurant panel and
// the courier app live in one repo and share src/components, src/lib, src/theme, src/errors, src/nav,
// src/ui … but never import each other's own code:
//   panel     (src/panel/**)            ↛ customer or courier code
//   courier   (src/courier/**)          ↛ customer or panel code
//   customer  (CUSTOMER_ONLY below)     ↛ panel or courier code
//   shared    (everything else in src) ↛ any app — so a shared component can never pull one app's
//                                        code into another app's bundle transitively.
// Tests, stories and src/test may use customer fixtures (mock data) freely. Shared code may use
// customer contract *types* (`import type`, erased at build — e.g. LatLng in MapProvider).
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');

/** Customer-app-only modules, relative to src/ (directories end with '/'). */
export const CUSTOMER_ONLY = [
  'app/',
  'screens/',
  'features/',
  'cart/',
  'auth/',
  'consent/',
  'mocks/',
  // Customer API contract (src/api/errors.ts and http.ts are shared).
  'api/client',
  'api/schema',
  'api/types',
  'api/useApi',
  'main',
];
/** Apps with their own folder under src/. */
const APP_DIRS = { 'panel/': 'panel', 'courier/': 'courier' };
const EXEMPT = /(?:\.test|\.stories)\.tsx?$|^test\/|^components\/stories\//;

const toSrc = (abs) => path.relative(SRC, abs).split(path.sep).join('/');
const isCustomer = (rel) =>
  CUSTOMER_ONLY.some((p) => (p.endsWith('/') ? rel.startsWith(p) : rel === p || rel.startsWith(p + '.')));
const zone = (rel) => {
  for (const [dir, name] of Object.entries(APP_DIRS)) if (rel.startsWith(dir)) return name;
  return isCustomer(rel) ? 'customer' : 'shared';
};

/** src-relative path an import specifier points to, or null when it is a package / outside src. */
function target(spec, file) {
  let abs;
  if (spec.startsWith('@/')) abs = path.join(SRC, spec.slice(2));
  else if (spec.startsWith('.')) abs = path.resolve(path.dirname(file), spec);
  else return null;
  const rel = toSrc(abs);
  return rel.startsWith('..') ? null : rel;
}

const rule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Keep the customer app, the restaurant panel and the courier app from importing each other.',
    },
    schema: [],
    messages: {
      customer: "'{{spec}}' is customer-app code; {{from}} code may only use shared modules (D-91).",
      panel: "'{{spec}}' is restaurant-panel code; {{from}} code may not import it (D-91).",
      courier: "'{{spec}}' is courier-app code; {{from}} code may not import it (D-125).",
    },
  },
  create(context) {
    const file = context.filename ?? context.getFilename();
    const fromRel = toSrc(path.resolve(file));
    if (fromRel.startsWith('..') || EXEMPT.test(fromRel)) return {};
    const from = zone(fromRel);

    const check = (node, typeOnly = false) => {
      const spec = node?.type === 'Literal' && typeof node.value === 'string' ? node.value : null;
      const rel = spec && target(spec, file);
      if (!rel) return;
      const to = zone(rel);
      if (to === 'shared' || to === from) return;
      if (typeOnly && from === 'shared' && to === 'customer') return;
      context.report({ node, messageId: to, data: { spec, from } });
    };
    return {
      ImportDeclaration: (n) => check(n.source, n.importKind === 'type'),
      ExportNamedDeclaration: (n) => check(n.source, n.exportKind === 'type'),
      ExportAllDeclaration: (n) => check(n.source),
      ImportExpression: (n) => check(n.source),
    };
  },
};

export default { rules: { 'app-boundaries': rule } };
