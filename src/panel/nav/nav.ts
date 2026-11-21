import { createStackNav } from '@/nav/createStackNav';

/**
 * Restaurant panel screens. `order`: detail on phones (params.id); `cats`: menu categories;
 * `dish`: food editor (params.id = edit, params.cat = new food in that category);
 * `group`: option-group editor of the dish being edited (params.i = index, none = new; params.add = add an option).
 */
export const PANEL_SCREENS = [
  'orders',
  'order',
  'menu',
  'cats',
  'dish',
  'group',
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
