import { create } from 'zustand';
import { readStorage, writeStorage } from '@/lib/storage';

export type Theme = 'light' | 'dark';
export const THEME_KEY = 'dk-theme';

/** Default is light (design-system §2). System preference fallback is pending owner approval. */
function initialTheme(): Theme {
  return readStorage(THEME_KEY) === 'dark' ? 'dark' : 'light';
}

function apply(theme: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') root.setAttribute('data-theme', 'dark');
  else root.removeAttribute('data-theme');
}

interface ThemeState {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

export const useTheme = create<ThemeState>((set, get) => {
  const theme = initialTheme();
  apply(theme);
  return {
    theme,
    setTheme: (t) => {
      writeStorage(THEME_KEY, t);
      apply(t);
      set({ theme: t });
    },
    toggle: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
  };
});
