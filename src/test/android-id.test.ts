import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The Android package id can never change after the first store upload, so every place
 * that declares it must agree. Domain dokoonapp.ir → ir.dokoonapp.customer (decision D-52).
 */
const ID = 'ir.dokoonapp.customer';
const root = path.resolve(__dirname, '../..');
const read = (f: string) => readFileSync(path.join(root, f), 'utf8');

describe('Android package id', () => {
  it('capacitor.config.ts uses the id', () => {
    expect(read('capacitor.config.ts')).toMatch(new RegExp(`appId: '${ID.replace(/\./g, '\\.')}'`));
  });

  it('Gradle namespace and applicationId match', () => {
    const g = read('android/app/build.gradle');
    expect(g).toContain(`namespace = "${ID}"`);
    expect(g).toContain(`applicationId "${ID}"`);
  });

  it('MainActivity lives in the matching Java package', () => {
    const f = `android/app/src/main/java/${ID.replace(/\./g, '/')}/MainActivity.java`;
    expect(existsSync(path.join(root, f)), f).toBe(true);
    expect(read(f)).toMatch(new RegExp(`^package ${ID.replace(/\./g, '\\.')};`, 'm'));
  });

  it('strings.xml package name and deep-link scheme match', () => {
    const s = read('android/app/src/main/res/values/strings.xml');
    expect(s).toContain(`<string name="package_name">${ID}</string>`);
    expect(s).toContain(`<string name="custom_url_scheme">${ID}</string>`);
  });

  it('the old id is gone from source and config', () => {
    for (const f of [
      'capacitor.config.ts',
      'android/app/build.gradle',
      'android/app/src/main/res/values/strings.xml',
      'docs/contract-notes.md',
    ]) {
      expect(read(f), f).not.toMatch(/ir\.dokoon\.customer/);
    }
    expect(existsSync(path.join(root, 'android/app/src/main/java/ir/dokoon'))).toBe(false);
  });
});
