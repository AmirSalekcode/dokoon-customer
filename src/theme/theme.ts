import { create } from 'zustand';
import { readStorage, writeStorage } from '@/lib/storage';

export type Theme = 'light' | 'dark';
/** 'system' = follow the phone's dark mode (default, decision D-60). */
export type ThemeMode = Theme | 'system';
export const THEME_KEY = 'dk-theme';
const QUERY = '(prefers-color-scheme: dark)';

type MatchMedia = (q: string) => {
  matches: boolean;
  addEventListener?: (t: 'change', l: (e: { matches: boolean }) => void) => void;
};

export function resolveTheme(mode: ThemeMode, systemDark: boolean): Theme {
  return mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;
}

function savedMode(): ThemeMode {
  const v = readStorage(THEME_KEY);
  return v === 'dark' || v === 'light' ? v : 'system';
}

function apply(theme: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') root.setAttribute('data-theme', 'dark');
  else root.removeAttribute('data-theme');
}

interface ThemeState {
  mode: ThemeMode;
  /** The theme actually shown. */
  theme: Theme;
  setMode: (m: ThemeMode) => void;
}

/** Factory (tests inject a fake matchMedia). Explicit choices are stored in `dk-theme`; 'system' is not stored. */
export function createThemeStore(matchMedia: MatchMedia | undefined) {
  const mql = matchMedia?.(QUERY);
  const systemDark = () => !!mql?.matches;

  return create<ThemeState>((set, get) => {
    const mode = savedMode();
    const theme = resolveTheme(mode, systemDark());
    apply(theme);

    // Live: follow the phone while in system mode.
    mql?.addEventListener?.('change', (e) => {
      if (get().mode !== 'system') return;
      const t = resolveTheme('system', e.matches);
      apply(t);
      set({ theme: t });
    });

    return {
      mode,
      theme,
      setMode: (m) => {
        writeStorage(THEME_KEY, m === 'system' ? null : m);
        const t = resolveTheme(m, systemDark());
        apply(t);
        set({ mode: m, theme: t });
      },
    };
  });
}

export const useTheme = createThemeStore(
  typeof window !== 'undefined' && window.matchMedia ? window.matchMedia.bind(window) : undefined,
);
