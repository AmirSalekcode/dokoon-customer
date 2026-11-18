import { create } from 'zustand';
import { readJson, writeJson } from '@/lib/storage';
import { useNav } from '@/nav/nav';
import type { RouteParams, ScreenId } from '@/nav/types';
import { useSession } from './session';

/**
 * Entry + login flow (decision D-59: guest browsing).
 * Launch: onboarding (first time) → city → home, no login. Login is asked only when the user opens a
 * guarded screen; after login they land exactly where they were going, with auth screens removed
 * from the stack so «back» never returns into login/OTP.
 */

export const AUTH_SCREENS: readonly ScreenId[] = ['login', 'otp', 'setup', 'perms'];

/** Screens that need an account. Browsing, cart and the account tab itself stay open to guests. */
export const GUARDED_SCREENS: readonly ScreenId[] = [
  'checkout',
  'orders',
  'track',
  'favs',
  'addresses',
  'notifs',
  'editprof',
  'promos',
];

// ---------- launch state ----------
const LAUNCH_KEY = 'dk-launch';
interface LaunchData {
  seenOnboarding: boolean;
  cityId: string | null;
}
const LAUNCH0: LaunchData = { seenOnboarding: false, cityId: null };

interface LaunchState extends LaunchData {
  finishOnboarding: () => void;
  setCity: (id: string) => void;
  reset: () => void;
}

export const useLaunch = create<LaunchState>((set, get) => {
  const save = (patch: Partial<LaunchData>) => {
    const next = { seenOnboarding: get().seenOnboarding, cityId: get().cityId, ...patch };
    writeJson(LAUNCH_KEY, next);
    set(next);
  };
  return {
    ...readJson<LaunchData>(LAUNCH_KEY, LAUNCH0),
    finishOnboarding: () => save({ seenOnboarding: true }),
    setCity: (cityId) => save({ cityId }),
    reset: () => {
      writeJson(LAUNCH_KEY, LAUNCH0);
      set(LAUNCH0);
    },
  };
});

/** First screen after the splash. */
export function bootScreen(): ScreenId {
  const l = useLaunch.getState();
  if (!l.seenOnboarding) return 'onboard';
  if (!l.cityId) return 'city';
  return 'home';
}

// ---------- login intent ----------
interface Intent {
  screen: ScreenId;
  params?: RouteParams;
}
interface AuthFlowState {
  intent: Intent | null;
  setIntent: (i: Intent | null) => void;
  reset: () => void;
}
export const useAuthFlow = create<AuthFlowState>((set) => ({
  intent: null,
  setIntent: (intent) => set({ intent }),
  reset: () => set({ intent: null }),
}));

export const isLoggedIn = () => !!useSession.getState().accessToken;

/** Name used in «سلام … عزیز» (CLAUDE.md rule 7); guests are «مهمان». */
export const GUEST_NAME = 'مهمان';
export const displayName = (name?: string | null) => (name && name.trim() ? name.trim() : GUEST_NAME);

/** Open a screen that may need login. Guests go to login first; the target is remembered. */
export function openGuarded(screen: ScreenId, params?: RouteParams) {
  const nav = useNav.getState();
  if (isLoggedIn() || !GUARDED_SCREENS.includes(screen)) {
    nav.push(screen, params);
    return;
  }
  useAuthFlow.getState().setIntent({ screen, params });
  nav.push('login');
}

/** After a successful OTP: new users complete their profile first. */
export function completeLogin({ isNewUser }: { isNewUser: boolean }) {
  if (isNewUser) {
    useNav.getState().setTop('setup');
    return;
  }
  finishAuth();
}

/** Leave the auth screens: back to where the user was, then open what they were going for. */
export function finishAuth() {
  const stack = useNav.getState().stack.filter((r) => !AUTH_SCREENS.includes(r.screen));
  const base = stack.length ? stack : useNav.getState().stack.slice(0, 1);
  useNav.setState({ stack: base, overlay: null });
  if (stack.length === 0) useNav.getState().resetTo('home');
  const intent = useAuthFlow.getState().intent;
  useAuthFlow.getState().setIntent(null);
  if (intent) useNav.getState().push(intent.screen, intent.params);
}
