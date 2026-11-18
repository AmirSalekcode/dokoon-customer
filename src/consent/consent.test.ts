import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CONSENT_KEY, CONSENT_VERSION, createConsentStore, hasConsent } from './consent';

describe('cookie consent store', () => {
  beforeEach(() => localStorage.clear());

  it('starts undecided with optional categories off (privacy by default)', () => {
    const s = createConsentStore().getState();
    expect(s.decided).toBe(false);
    expect(s.categories).toEqual({ essential: true, analytics: false });
  });

  it('acceptAll turns on optional categories and persists with version + date', () => {
    const store = createConsentStore();
    store.getState().acceptAll();
    expect(store.getState()).toMatchObject({
      decided: true,
      categories: { essential: true, analytics: true },
    });
    const saved = JSON.parse(localStorage.getItem(CONSENT_KEY)!);
    expect(saved).toMatchObject({ version: CONSENT_VERSION, analytics: true });
    expect(Date.parse(saved.decidedAt)).not.toBeNaN();
  });

  it('essentialOnly keeps optional categories off', () => {
    const store = createConsentStore();
    store.getState().essentialOnly();
    expect(store.getState()).toMatchObject({ decided: true, categories: { analytics: false } });
  });

  it('save() stores a custom choice; essential can never be turned off', () => {
    const store = createConsentStore();
    store.getState().save({ analytics: true, essential: false } as never);
    expect(store.getState().categories).toEqual({ essential: true, analytics: true });
  });

  it('restores a saved decision on startup', () => {
    createConsentStore().getState().acceptAll();
    const again = createConsentStore().getState();
    expect(again.decided).toBe(true);
    expect(again.categories.analytics).toBe(true);
  });

  it('asks again when the consent version changes', () => {
    localStorage.setItem(
      CONSENT_KEY,
      JSON.stringify({ version: CONSENT_VERSION - 1, analytics: true, decidedAt: '2026-01-01' }),
    );
    expect(createConsentStore().getState().decided).toBe(false);
  });

  it('treats corrupt storage as undecided', () => {
    localStorage.setItem(CONSENT_KEY, '{not json');
    expect(createConsentStore().getState().decided).toBe(false);
  });

  it('still works in memory when storage throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const store = createConsentStore();
    store.getState().acceptAll();
    expect(store.getState().decided).toBe(true);
    spy.mockRestore();
  });

  it('reset() re-opens the choice (from settings)', () => {
    const store = createConsentStore();
    store.getState().acceptAll();
    store.getState().reset();
    expect(store.getState().decided).toBe(false);
    expect(localStorage.getItem(CONSENT_KEY)).toBeNull();
  });

  it('hasConsent() gates optional features', () => {
    const store = createConsentStore();
    expect(hasConsent(store.getState(), 'analytics')).toBe(false);
    expect(hasConsent(store.getState(), 'essential')).toBe(true);
    store.getState().acceptAll();
    expect(hasConsent(store.getState(), 'analytics')).toBe(true);
  });
});
