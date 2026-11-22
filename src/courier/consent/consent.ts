import { create } from 'zustand';
import { readJson, writeJson } from '@/lib/storage';
import type { CourierApi } from '../api/client';
import { useCourierSession } from '../api/session';

/** Courier cookie choice (prototype «کوکی‌ها»: ضروری ثابت، عملکرد، آمار). Optional ones default off. */
export const COURIER_CONSENT_KEY = 'dkc-consent';
/** Bump when the categories or the text change materially → couriers are asked again. */
export const COURIER_CONSENT_VERSION = 1;

export interface ConsentChoice {
  performance: boolean;
  analytics: boolean;
}

interface Saved extends ConsentChoice {
  version: number;
  decidedAt: string;
  /** The server has this choice (`PUT /c/consent` succeeded). */
  synced: boolean;
}

export interface CourierConsentState {
  decided: boolean;
  choice: ConsentChoice;
  synced: boolean;
  decide: (c: ConsentChoice) => void;
  markSynced: () => void;
}

const OFF: ConsentChoice = { performance: false, analytics: false };

function load(): Pick<CourierConsentState, 'decided' | 'choice' | 'synced'> {
  const s = readJson<Saved | null>(COURIER_CONSENT_KEY, null);
  if (!s || s.version !== COURIER_CONSENT_VERSION || typeof s.analytics !== 'boolean')
    return { decided: false, choice: OFF, synced: false };
  return {
    decided: true,
    choice: { performance: s.performance === true, analytics: s.analytics },
    synced: s.synced === true,
  };
}

/**
 * Stored on the device first (the card shows on the login page, before there is a session); sent to the
 * server with `PUT /c/consent` once signed in (contract: the call needs a session).
 */
export const useCourierConsent = create<CourierConsentState>((set, get) => {
  const persist = (choice: ConsentChoice, synced: boolean) =>
    writeJson(COURIER_CONSENT_KEY, {
      version: COURIER_CONSENT_VERSION,
      ...choice,
      decidedAt: new Date().toISOString(),
      synced,
    } satisfies Saved);
  return {
    ...load(),
    decide: (choice) => {
      persist(choice, false);
      set({ decided: true, choice, synced: false });
    },
    markSynced: () => {
      persist(get().choice, true);
      set({ synced: true });
    },
  };
});

/** Re-read storage (tests, another tab). */
export const reloadCourierConsent = () => useCourierConsent.setState(load());

/**
 * Send a decided, not yet synced choice to the server. Best effort: offline or an error leaves it for the
 * next sign-in; never raises a full-page error.
 */
export async function syncCourierConsent(api: CourierApi): Promise<void> {
  const { decided, synced, choice } = useCourierConsent.getState();
  if (!decided || synced || !useCourierSession.getState().status) return;
  try {
    const { response } = await api.PUT('/c/consent', { body: choice });
    if (response.ok) useCourierConsent.getState().markSynced();
  } catch {
    // Kept locally; retried after the next sign-in.
  }
}
