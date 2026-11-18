import { create } from 'zustand';
import { readJson, writeJson, writeStorage } from '@/lib/storage';

export const CONSENT_KEY = 'dk-consent';
/** Bump when the categories or the privacy text change materially → users are asked again. */
export const CONSENT_VERSION = 1;

export type ConsentCategory = 'essential' | 'analytics';
export type Categories = Record<ConsentCategory, boolean>;

interface Saved {
  version: number;
  analytics: boolean;
  decidedAt: string;
}

export interface ConsentState {
  decided: boolean;
  categories: Categories;
  acceptAll: () => void;
  essentialOnly: () => void;
  save: (c: Partial<Categories>) => void;
  /** Re-open the choice (settings → cookie preferences). */
  reset: () => void;
}

const OFF: Categories = { essential: true, analytics: false };

function load(): Pick<ConsentState, 'decided' | 'categories'> {
  const s = readJson<Saved | null>(CONSENT_KEY, null);
  if (!s || s.version !== CONSENT_VERSION || typeof s.analytics !== 'boolean')
    return { decided: false, categories: OFF };
  return { decided: true, categories: { essential: true, analytics: s.analytics } };
}

/**
 * Cookie / local-storage consent. Essential storage (theme, cart, session) is always on because the
 * app cannot work without it; optional categories (analytics) default OFF until the user opts in.
 */
export function createConsentStore() {
  return create<ConsentState>((set) => {
    const decide = (analytics: boolean) => {
      writeJson(CONSENT_KEY, {
        version: CONSENT_VERSION,
        analytics,
        decidedAt: new Date().toISOString(),
      } satisfies Saved);
      set({ decided: true, categories: { essential: true, analytics } });
    };
    return {
      ...load(),
      acceptAll: () => decide(true),
      essentialOnly: () => decide(false),
      save: (c) => decide(!!c.analytics),
      reset: () => {
        writeStorage(CONSENT_KEY, null);
        set({ decided: false, categories: OFF });
      },
    };
  });
}

export const useConsent = createConsentStore();

export const hasConsent = (s: Pick<ConsentState, 'categories'>, c: ConsentCategory) => s.categories[c];
