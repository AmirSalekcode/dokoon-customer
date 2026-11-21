import { isNative } from './platform';
import { DokoonNative, type DokoonNativePlugin } from './native';
import { readStorage, writeStorage } from './storage';

/**
 * Where session tokens live (D-38, KAN-72): localStorage in the browser/PWA, the Android Keystore in both
 * Android apps. The session stores stay synchronous: the web reads localStorage at start-up, the apps call
 * `hydrateSecure()` once before the first render and then write through in the background.
 */
export interface SecureBackend {
  readonly native: boolean;
  get(key: string): Promise<string | null>;
  /** null removes the value. */
  set(key: string, value: string | null): void;
}

export const webBackend: SecureBackend = {
  native: false,
  get: async (key) => readStorage(key),
  set: (key, value) => writeStorage(key, value),
};

/** Keystore backend; tokens a previous app version left in localStorage move over once. */
export function nativeBackend(
  plugin: Pick<DokoonNativePlugin, 'secureGet' | 'secureSet' | 'secureRemove'>,
): SecureBackend {
  /** Writes run in order, so a quick sign-in → sign-out never ends with the old token stored. */
  let chain: Promise<unknown> = Promise.resolve();
  const queue = (job: () => Promise<unknown>) => {
    chain = chain.then(job).catch((err: unknown) => console.error('[secureStore] write failed', err));
  };
  return {
    native: true,
    async get(key) {
      await chain;
      let value: string | null = null;
      try {
        value = (await plugin.secureGet({ key })).value ?? null;
      } catch (err) {
        console.error('[secureStore] read failed', err);
      }
      const legacy = readStorage(key);
      if (legacy !== null) {
        writeStorage(key, null);
        if (value === null) {
          value = legacy;
          queue(() => plugin.secureSet({ key, value: legacy }));
        }
      }
      return value;
    },
    set(key, value) {
      writeStorage(key, null); // never leave a plain-text copy behind
      queue(() => (value === null ? plugin.secureRemove({ key }) : plugin.secureSet({ key, value })));
    },
  };
}

let current: SecureBackend | null = null;
export const secureBackend = (): SecureBackend =>
  (current ??= isNative() ? nativeBackend(DokoonNative) : webBackend);
/** Tests only. */
export const setSecureBackend = (b: SecureBackend | null) => {
  current = b;
};

/** Synchronous start-up value: localStorage on the web, nothing in the apps (wait for hydrateSecure). */
export function readSecureJsonSync<T>(key: string, fallback: T): T {
  if (secureBackend().native) return fallback;
  return parse(readStorage(key), fallback);
}

/** Apps: the stored value from the Keystore (fallback when absent or unreadable). */
export async function hydrateSecure<T>(key: string, fallback: T): Promise<T> {
  return parse(await secureBackend().get(key), fallback);
}

export function writeSecureJson(key: string, value: unknown): void {
  secureBackend().set(key, JSON.stringify(value));
}

function parse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
