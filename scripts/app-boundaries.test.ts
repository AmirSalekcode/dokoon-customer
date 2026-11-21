import path from 'node:path';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

// D-91: the panel (src/panel) and the customer app share src/components, src/lib, src/theme … but
// never import each other's own code. Checked through the real eslint.config.js.
const root = path.resolve(__dirname, '..');
const eslint = new ESLint({ cwd: root });
const RULE = 'dokoon/app-boundaries';

async function errors(file: string, code: string) {
  const [res] = await eslint.lintText(code, { filePath: path.join(root, file) });
  return res.messages.filter((m) => m.ruleId === RULE).map((m) => m.message);
}

describe('ESLint app boundaries (customer ↔ panel)', () => {
  it('panel may import shared code', async () => {
    const code = [
      "import { Button } from '@/components/base/Button';",
      "import { useTheme } from '@/theme/theme';",
      "import { toFaDigits } from '@/lib/format';",
      "import type { ErrorKind } from '@/api/errors';",
      "import { createHttp } from '@/api/http';",
      "import { useNav } from '../nav/nav';",
      "import { PanelApp } from './PanelApp';",
      'export { Button, useTheme, toFaDigits, createHttp, useNav, PanelApp };',
      'export type { ErrorKind };',
    ].join('\n');
    expect(await errors('src/panel/main.tsx', code)).toEqual([]);
  });

  it('panel may not import customer-only code (alias, relative, re-export or dynamic import)', async () => {
    const code = [
      "import { App } from '@/app/App';",
      "import { HomeScreen } from '../screens/HomeScreen';",
      "import { useCart } from '@/cart/cart';",
      "import { client } from '@/api/client';",
      "export * from '@/mocks/handlers';",
      "void import('@/features/orders');",
      'export { App, HomeScreen, useCart, client };',
    ].join('\n');
    const out = await errors('src/panel/main.tsx', code);
    expect(out).toHaveLength(6);
    expect(out[0]).toMatch(/customer/i);
  });

  it("a panel folder named like a customer folder is still the panel's own code", async () => {
    const code = "import { OrdersScreen } from '../screens/OrdersScreen';\nexport { OrdersScreen };";
    expect(await errors('src/panel/app/Shell.tsx', code)).toEqual([]);
  });

  it('customer code may not import the panel', async () => {
    const code = "import { PanelApp } from '@/panel/PanelApp';\nexport { PanelApp };";
    expect(await errors('src/screens/HomeScreen.tsx', code)).toHaveLength(1);
  });

  it('shared code may import neither app (so the panel never pulls customer code in transitively)', async () => {
    const code = [
      "import { PanelApp } from '../../panel/PanelApp';",
      "import { useCart } from '@/cart/cart';",
      'export { PanelApp, useCart };',
    ].join('\n');
    expect(await errors('src/components/library/Thing.tsx', code)).toHaveLength(2);
  });

  it('shared code may use customer contract types (erased at build), but the panel may not', async () => {
    const code = "import type { LatLng } from '@/api/types';\nexport type { LatLng };";
    expect(await errors('src/providers/map/MapProvider.ts', code)).toEqual([]);
    expect(await errors('src/panel/map.ts', code)).toHaveLength(1);
  });

  it('tests and stories of shared code may use customer fixtures', async () => {
    const code = "import { db } from '@/mocks/data';\nexport { db };";
    expect(await errors('src/components/library/Thing.test.tsx', code)).toEqual([]);
    expect(await errors('src/components/stories/Thing.stories.tsx', code)).toEqual([]);
  });

  it('the customer app may import its own code', async () => {
    const code = "import { useCart } from '@/cart/cart';\nexport { useCart };";
    expect(await errors('src/screens/CartScreen.tsx', code)).toEqual([]);
  });
});

// D-125: the courier app (src/courier) is a third zone with the same rules.
describe('ESLint app boundaries (courier ↔ customer ↔ panel)', () => {
  it('courier may import shared code and its own code', async () => {
    const code = [
      "import { Button } from '@/components/base/Button';",
      "import { useTheme } from '@/theme/theme';",
      "import { createHttp } from '@/api/http';",
      "import { CourierApp } from './CourierApp';",
      "import { OrdersScreen } from './screens/OrdersScreen';",
      'export { Button, useTheme, createHttp, CourierApp, OrdersScreen };',
    ].join('\n');
    expect(await errors('src/courier/main.tsx', code)).toEqual([]);
    // A courier folder named like a customer folder is still the courier's own code.
    const nested = "import { OrdersScreen } from '../screens/OrdersScreen';\nexport { OrdersScreen };";
    expect(await errors('src/courier/shell/Shell.tsx', nested)).toEqual([]);
  });

  it('courier may import neither the customer app nor the panel', async () => {
    const code = [
      "import { App } from '@/app/App';",
      "import { useCart } from '@/cart/cart';",
      "import type { LatLng } from '@/api/types';",
      "import { PanelApp } from '@/panel/PanelApp';",
      "void import('../panel/realtime/live');",
      'export { App, useCart, PanelApp };',
      'export type { LatLng };',
    ].join('\n');
    const out = await errors('src/courier/main.tsx', code);
    expect(out).toHaveLength(5);
    expect(out.filter((m) => /customer/i.test(m))).toHaveLength(3);
    expect(out.filter((m) => /restaurant-panel/i.test(m))).toHaveLength(2);
  });

  it('neither the customer app, the panel nor shared code may import the courier app', async () => {
    const code = "import { CourierApp } from '@/courier/CourierApp';\nexport { CourierApp };";
    for (const file of [
      'src/screens/HomeScreen.tsx',
      'src/panel/PanelApp.tsx',
      'src/components/library/Thing.tsx',
    ]) {
      const out = await errors(file, code);
      expect(out, file).toHaveLength(1);
      expect(out[0], file).toMatch(/courier-app code/);
    }
  });
});
