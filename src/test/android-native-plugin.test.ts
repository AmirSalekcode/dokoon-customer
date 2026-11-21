import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/** KAN-72: both Android apps use Dokoon's own native plugin (no third-party plugin). */
const root = path.resolve(__dirname, '../..');
const read = (f: string) => readFileSync(path.join(root, f), 'utf8');
const MODULE = 'native-android/dokoon-plugins';

const apps = [
  { dir: 'android', main: 'android/app/src/main/java/ir/dokoonapp/customer/MainActivity.java', rel: '../' },
  {
    dir: 'android-panel/android',
    main: 'android-panel/android/app/src/main/java/ir/dokoonapp/restaurant/MainActivity.java',
    rel: '../../',
  },
];

describe('shared native plugin', () => {
  it('exists with the Keystore store and the alert sound', () => {
    expect(read(`${MODULE}/src/main/java/ir/dokoonapp/plugins/SecureStore.java`)).toContain(
      '"AndroidKeyStore"',
    );
    expect(read(`${MODULE}/src/main/java/ir/dokoonapp/plugins/DokoonNativePlugin.java`)).toContain(
      'name = "DokoonNative"',
    );
    expect(existsSync(path.join(root, `${MODULE}/src/main/res/raw/new_order.wav`))).toBe(true);
  });

  for (const a of apps) {
    it(`${a.dir}: included, depended on and registered before the bridge starts`, () => {
      expect(read(`${a.dir}/settings.gradle`)).toContain(`new File('${a.rel}${MODULE}')`);
      expect(read(`${a.dir}/app/build.gradle`)).toContain("implementation project(':dokoon-plugins')");
      const m = read(a.main);
      expect(m.indexOf('registerPlugin(DokoonNativePlugin.class)')).toBeGreaterThan(-1);
      expect(m.indexOf('registerPlugin(DokoonNativePlugin.class)')).toBeLessThan(
        m.indexOf('super.onCreate(savedInstanceState);'),
      );
    });
  }

  it('the JS bridge uses the same plugin name', () => {
    expect(read('src/lib/native.ts')).toContain("registerPlugin<DokoonNativePlugin>('DokoonNative')");
  });

  it('the customer app does not ask for the restaurant-only permissions', () => {
    const m = read('android/app/src/main/AndroidManifest.xml');
    expect(m).toContain('android.permission.POST_NOTIFICATIONS" tools:node="remove"');
    expect(m).toContain('android.permission.VIBRATE" tools:node="remove"');
  });

  it('neither session store writes tokens with plain localStorage helpers any more', () => {
    for (const f of ['src/auth/session.ts', 'src/panel/api/session.ts']) {
      const s = read(f);
      expect(s, f).toContain('writeSecureJson(');
      expect(s, f).not.toMatch(/\bwriteJson\(/);
    }
  });
});
