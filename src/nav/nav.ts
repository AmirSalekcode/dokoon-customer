import { createStackNav } from './createStackNav';
import type { OverlayKind, ScreenId, TabId } from './types';
import { TABS } from './types';

export { EXIT_WINDOW_MS, type BackResult } from './createStackNav';

/** Customer app navigation (shared stack logic in createStackNav.ts). */
const nav = createStackNav<ScreenId, TabId, OverlayKind>({
  // App start: splash decides onboarding / city / home (see auth/flow.ts bootScreen).
  initial: 'splash',
  tabs: TABS,
  home: 'home',
  errorScreen: 'error',
});

export const useNav = nav.useStore;
export const setBackInterceptor = nav.setBackInterceptor;
export const topRoute = nav.topRoute;
