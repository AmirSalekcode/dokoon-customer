import { createStackNav } from '@/nav/createStackNav';

/** Restaurant panel screens (`order`: detail on phones, params.id); menu editors… arrive with their tasks. */
export const PANEL_SCREENS = [
  'orders',
  'order',
  'menu',
  'reports',
  'account',
  'help',
  'login',
  'reg',
  'reg-status',
  'reg-docs',
  'shift',
  'sound',
  'error',
] as const;
export type PanelScreen = (typeof PANEL_SCREENS)[number];

/** Root tabs (restaurant/dokoon-restaurant-screen-specs.md): switching resets the stack. */
export type PanelTab = 'orders' | 'menu' | 'reports' | 'account';
export const PANEL_TABS: readonly PanelTab[] = ['orders', 'menu', 'reports', 'account'];

/** Overlays (one at a time). */
/** confirm = ConfirmDialog; alert = new-order alert; prep / reason = order sheets (props.id). */
export type PanelOverlay = 'confirm' | 'alert' | 'prep' | 'reason';

const nav = createStackNav<PanelScreen, PanelTab, PanelOverlay>({
  initial: 'login',
  tabs: PANEL_TABS,
  home: 'orders',
  errorScreen: 'error',
});

export const usePanelNav = nav.useStore;
export const setPanelBackInterceptor = nav.setBackInterceptor;
export const isPanelTab = (s: string): s is PanelTab => (PANEL_TABS as readonly string[]).includes(s);
