import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Restaurant Android app (KAN-71, D-92): its package id can never change after the first store upload,
 * so every place that declares it must agree — and the customer app must keep its own id.
 */
const ID = 'ir.dokoonapp.restaurant';
const CUSTOMER = 'ir.dokoonapp.customer';
const root = path.resolve(__dirname, '../..');
const read = (f: string) => readFileSync(path.join(root, f), 'utf8');
const esc = (s: string) => s.replace(/\./g, '\\.');
const APP = 'android-panel/android/app';

describe('restaurant Android package id', () => {
  it('android-panel/capacitor.config.ts: id, name and the panel bundle', () => {
    const c = read('android-panel/capacitor.config.ts');
    expect(c).toMatch(new RegExp(`appId: '${esc(ID)}'`));
    expect(c).toContain("appName: 'دکون رستوران'");
    expect(c).toContain("webDir: '../dist-panel'");
  });

  it('Gradle namespace and applicationId match', () => {
    const g = read(`${APP}/build.gradle`);
    expect(g).toContain(`namespace = "${ID}"`);
    expect(g).toContain(`applicationId "${ID}"`);
  });

  it('MainActivity lives in the matching Java package', () => {
    const f = `${APP}/src/main/java/${ID.replace(/\./g, '/')}/MainActivity.java`;
    expect(existsSync(path.join(root, f)), f).toBe(true);
    expect(read(f)).toMatch(new RegExp(`^package ${esc(ID)};`, 'm'));
  });

  it('strings.xml: label, package name and deep-link scheme', () => {
    const s = read(`${APP}/src/main/res/values/strings.xml`);
    expect(s).toContain('<string name="app_name">دکون رستوران</string>');
    expect(s).toContain(`<string name="package_name">${ID}</string>`);
    expect(s).toContain(`<string name="custom_url_scheme">${ID}</string>`);
    expect(read(`${APP}/src/main/AndroidManifest.xml`)).toContain(
      '<data android:scheme="@string/custom_url_scheme" />',
    );
  });

  it('the scheme the web code parses is the package id', () => {
    expect(read('src/panel/native/app.ts')).toContain(`PANEL_SCHEME = '${ID}'`);
  });

  it('the customer app is untouched and the two never share an id', () => {
    expect(read('capacitor.config.ts')).toContain(`appId: '${CUSTOMER}'`);
    expect(read('android/app/build.gradle')).toContain(`applicationId "${CUSTOMER}"`);
    for (const f of [
      'android-panel/capacitor.config.ts',
      `${APP}/build.gradle`,
      `${APP}/src/main/res/values/strings.xml`,
    ])
      expect(read(f), f).not.toContain(CUSTOMER);
  });

  it('phones are portrait, tablets rotate, sound plays without a tap', () => {
    const m = read(`${APP}/src/main/java/${ID.replace(/\./g, '/')}/MainActivity.java`);
    expect(m).toContain('SCREEN_ORIENTATION_PORTRAIT');
    expect(m).toContain('smallestScreenWidthDp >= TABLET_MIN_DP');
    expect(m).toContain('setMediaPlaybackRequiresUserGesture(false)');
  });

  it('release signing comes only from the environment', () => {
    const g = read(`${APP}/build.gradle`);
    expect(g).toContain('System.getenv("ANDROID_KEYSTORE_FILE")');
    expect(g).toContain('System.getenv("ANDROID_VERSION_CODE")');
  });
});
