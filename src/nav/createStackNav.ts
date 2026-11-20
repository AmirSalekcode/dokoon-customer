import { create } from 'zustand';
import type { ErrorKind } from '@/api/errors';
import { toast } from '@/ui/toast';

/**
 * Stack navigation shared by the customer app and the restaurant panel (D-91):
 * exact back (screens stay mounted), tabs reset the stack, one overlay at a time,
 * full-page errors, Android/browser back with «press again to exit» (D-20).
 */
export type BackResult = 'overlay' | 'intercepted' | 'popped' | 'exit-armed' | 'exit';
export const EXIT_WINDOW_MS = 2000;
export const EXIT_TOAST = 'برای خروج دوباره بزنید';

export type RouteParams = Record<string, string>;
export interface StackRoute<S extends string> {
  /** Unique per push — keeps mounted screen state/scroll when returning. */
  key: string;
  screen: S;
  params: RouteParams;
}
export interface StackOverlay<K extends string> {
  kind: K;
  props?: Record<string, unknown>;
  /** Overlay to restore when this one closes. */
  parent?: StackOverlay<K> | null;
}

export interface StackNavState<S extends string, T extends S, K extends string> {
  stack: StackRoute<S>[];
  overlay: StackOverlay<K> | null;
  exitArmedAt: number;
  push: (screen: S, params?: RouteParams) => void;
  /** Replace the top screen. */
  setTop: (screen: S, params?: RouteParams) => void;
  /** Pop exactly one screen. Returns false at the root. */
  back: () => boolean;
  /** Tabs reset the stack. */
  resetTo: (screen: T | S, params?: RouteParams) => void;
  openOverlay: (o: StackOverlay<K>, opts?: { keepParent?: boolean }) => void;
  closeOverlay: () => void;
  /** Full-page error; does not stack the same kind twice. */
  showError: (kind: ErrorKind) => void;
  handleSystemBack: () => BackResult;
}

export interface StackNavOptions<S extends string, T extends S> {
  initial: S;
  /** Root tabs. Back on a non-home tab root goes to `home` first. */
  tabs: readonly T[];
  home: T;
  /** The full-page error screen id. */
  errorScreen: S;
}

export function createStackNav<S extends string, T extends S, K extends string>(opts: StackNavOptions<S, T>) {
  let keySeq = 0;
  const route = (screen: S, params: RouteParams = {}): StackRoute<S> => ({
    key: `r${++keySeq}`,
    screen,
    params,
  });
  /** Per-route back interceptors (e.g. customer `paid` → home). */
  const interceptors = new Map<string, () => boolean>();

  const useStore = create<StackNavState<S, T, K>>((set, get) => ({
    stack: [route(opts.initial)],
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

    openOverlay: (o, o2) => {
      const cur = get().overlay;
      set({ overlay: { ...o, parent: o2?.keepParent ? cur : null } });
    },

    closeOverlay: () => set({ overlay: get().overlay?.parent ?? null }),

    showError: (kind) => {
      const top = get().stack[get().stack.length - 1];
      if (top?.screen === opts.errorScreen && top.params.kind === kind) return;
      get().push(opts.errorScreen, { kind });
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
      if (top && top.screen !== opts.home && (opts.tabs as readonly string[]).includes(top.screen)) {
        // Non-home tab root: go to the home tab first, the natural «back» for tabs.
        st.resetTo(opts.home);
        set({ exitArmedAt: 0 });
        return 'popped';
      }
      toast(EXIT_TOAST);
      return 'exit-armed';
    },
  }));

  const setBackInterceptor = (routeKey: string, fn: (() => boolean) | null) => {
    if (fn) interceptors.set(routeKey, fn);
    else interceptors.delete(routeKey);
  };
  const topRoute = () => {
    const s = useStore.getState().stack;
    return s[s.length - 1];
  };
  return { useStore, setBackInterceptor, topRoute };
}

/** The part of a nav store the platform wiring needs (systemBack.ts). */
export interface SystemBackTarget {
  getState: () => {
    stack: { screen: string; params: RouteParams }[];
    handleSystemBack: () => BackResult;
    showError: (kind: ErrorKind) => void;
    back: () => boolean;
  };
}
