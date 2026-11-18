import { create } from 'zustand';
import type { ErrorKind } from '@/api/errors';
import { toast } from '@/ui/toast';
import type { Overlay, Route, RouteParams, ScreenId, TabId } from './types';
import { TABS } from './types';

let keySeq = 0;
const route = (screen: ScreenId, params: RouteParams = {}): Route => ({
  key: `r${++keySeq}`,
  screen,
  params,
});

/** Result of a system back press (Android back button, browser back, swipe). */
export type BackResult = 'overlay' | 'intercepted' | 'popped' | 'exit-armed' | 'exit';

type Interceptor = () => boolean;
/** Per-route back interceptors (e.g. `paid` → home, `gateway` → cancel → payfail). */
const interceptors = new Map<string, Interceptor>();

export const EXIT_WINDOW_MS = 2000;

interface NavState {
  stack: Route[];
  overlay: Overlay | null;
  exitArmedAt: number;
  push: (screen: ScreenId, params?: RouteParams) => void;
  /** Replace the top screen (e.g. splash → login, otp → home). */
  setTop: (screen: ScreenId, params?: RouteParams) => void;
  /** Pop exactly one screen. Returns false at the root. */
  back: () => boolean;
  /** Bottom tabs reset the stack. */
  resetTo: (tab: TabId | ScreenId, params?: RouteParams) => void;
  openOverlay: (o: Overlay, opts?: { keepParent?: boolean }) => void;
  closeOverlay: () => void;
  /** Full-page error (screen-specs §5). Does not stack the same kind twice. */
  showError: (kind: ErrorKind) => void;
  handleSystemBack: () => BackResult;
}

export const useNav = create<NavState>((set, get) => ({
  // App start: splash decides onboarding / city / home (see auth/flow.ts bootScreen).
  stack: [route('splash')],
  overlay: null,
  exitArmedAt: 0,

  push: (screen, params) => set({ stack: [...get().stack, route(screen, params)], overlay: null }),

  setTop: (screen, params) => {
    const s = get().stack;
    const old = s[s.length - 1];
    if (old) interceptors.delete(old.key);
    set({ stack: [...s.slice(0, -1), route(screen, params)], overlay: null });
  },

  back: () => {
    const s = get().stack;
    if (s.length <= 1) return false;
    interceptors.delete(s[s.length - 1].key);
    set({ stack: s.slice(0, -1), overlay: null });
    return true;
  },

  resetTo: (screen, params) => {
    interceptors.clear();
    set({ stack: [route(screen, params)], overlay: null, exitArmedAt: 0 });
  },

  openOverlay: (o, opts) => {
    const cur = get().overlay;
    set({ overlay: { ...o, parent: opts?.keepParent ? cur : null } });
  },

  closeOverlay: () => set({ overlay: get().overlay?.parent ?? null }),

  showError: (kind) => {
    const top = get().stack[get().stack.length - 1];
    if (top?.screen === 'error' && top.params.kind === kind) return;
    get().push('error', { kind });
  },

  handleSystemBack: () => {
    const st = get();
    if (st.overlay) {
      st.closeOverlay();
      return 'overlay';
    }
    const top = st.stack[st.stack.length - 1];
    const fn = top && interceptors.get(top.key);
    if (fn && fn()) return 'intercepted';
    if (st.back()) return 'popped';
    // At a root screen: first press warns, second press within the window exits.
    const now = Date.now();
    if (now - st.exitArmedAt < EXIT_WINDOW_MS) return 'exit';
    set({ exitArmedAt: now });
    if (top && top.screen !== 'home' && (TABS as string[]).includes(top.screen)) {
      // Non-home tab root: go to home first, which is the natural "back" for tabs.
      st.resetTo('home');
      set({ exitArmedAt: 0 });
      return 'popped';
    }
    toast('برای خروج دوباره بزنید');
    return 'exit-armed';
  },
}));

export function setBackInterceptor(routeKey: string, fn: Interceptor | null) {
  if (fn) interceptors.set(routeKey, fn);
  else interceptors.delete(routeKey);
}

export const topRoute = () => {
  const s = useNav.getState().stack;
  return s[s.length - 1];
};
