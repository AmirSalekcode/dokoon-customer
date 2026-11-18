import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createThemeStore, resolveTheme, THEME_KEY } from './theme';

/** Fake matchMedia('(prefers-color-scheme: dark)') whose value can change at runtime. */
function fakeSystem(dark: boolean) {
  const listeners = new Set<(e: { matches: boolean }) => void>();
  const mql = {
    matches: dark,
    addEventListener: (_: string, l: (e: { matches: boolean }) => void) => listeners.add(l),
    removeEventListener: (_: string, l: (e: { matches: boolean }) => void) => listeners.delete(l),
  };
  return {
    matchMedia: vi.fn(() => mql),
    set(next: boolean) {
      mql.matches = next;
      listeners.forEach((l) => l({ matches: next }));
    },
  };
}

const attr = () => document.documentElement.getAttribute('data-theme');

describe('theme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('resolveTheme: system follows the phone, explicit modes win', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('defaults to following the phone (dark phone → dark app)', () => {
    const sys = fakeSystem(true);
    const s = createThemeStore(sys.matchMedia).getState();
    expect(s.mode).toBe('system');
    expect(s.theme).toBe('dark');
    expect(attr()).toBe('dark');
  });

  it('defaults to light when the phone is light', () => {
    const s = createThemeStore(fakeSystem(false).matchMedia).getState();
    expect(s.theme).toBe('light');
    expect(attr()).toBeNull();
  });

  it('switches live when the phone toggles dark mode (system mode)', () => {
    const sys = fakeSystem(false);
    const store = createThemeStore(sys.matchMedia);
    sys.set(true);
    expect(store.getState().theme).toBe('dark');
    expect(attr()).toBe('dark');
    sys.set(false);
    expect(store.getState().theme).toBe('light');
    expect(attr()).toBeNull();
  });

  it('an explicit choice is saved and ignores phone changes', () => {
    const sys = fakeSystem(false);
    const store = createThemeStore(sys.matchMedia);
    store.getState().setMode('dark');
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
    sys.set(false);
    expect(store.getState().theme).toBe('dark');
    store.getState().setMode('light');
    sys.set(true);
    expect(store.getState().theme).toBe('light');
  });

  it('choosing «system» again removes the saved choice and follows the phone', () => {
    const sys = fakeSystem(true);
    const store = createThemeStore(sys.matchMedia);
    store.getState().setMode('light');
    store.getState().setMode('system');
    expect(localStorage.getItem(THEME_KEY)).toBeNull();
    expect(store.getState().theme).toBe('dark');
  });

  it('restores a saved explicit choice (old values light/dark stay valid)', () => {
    localStorage.setItem(THEME_KEY, 'light');
    const s = createThemeStore(fakeSystem(true).matchMedia).getState();
    expect(s.mode).toBe('light');
    expect(s.theme).toBe('light');
  });

  it('ignores garbage in storage and works without matchMedia', () => {
    localStorage.setItem(THEME_KEY, 'purple');
    const s = createThemeStore(undefined).getState();
    expect(s.mode).toBe('system');
    expect(s.theme).toBe('light');
  });
});
