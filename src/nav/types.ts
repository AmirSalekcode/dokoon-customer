/** Screen ids from docs/dokoon-screen-specs.md (v48). */
export const SCREEN_IDS = [
  'splash',
  'onboard',
  'city',
  'login',
  'otp',
  'setup',
  'perms',
  'home',
  'search',
  'restaurants',
  'offers',
  'campaign',
  'restaurant',
  'restinfo',
  'cart',
  'checkout',
  'addaddr',
  'gateway',
  'paid',
  'payfail',
  'orders',
  'track',
  'cancel',
  'report',
  'rateorder',
  'account',
  'favs',
  'notifs',
  'editprof',
  'settings',
  'promos',
  'addresses',
  'support',
  'invite',
  'about',
  'legal',
  'social',
  'rateapp',
  'apply',
  'soon',
  'error',
] as const;
export type ScreenId = (typeof SCREEN_IDS)[number];

/** Bottom tabs (reset the stack). */
export type TabId = 'home' | 'restaurants' | 'cart' | 'offers' | 'account';
export const TABS: TabId[] = ['home', 'restaurants', 'cart', 'offers', 'account'];

export type RouteParams = Record<string, string>;

export interface Route {
  /** Unique per push — keeps mounted screen state/scroll when returning. */
  key: string;
  screen: ScreenId;
  params: RouteParams;
}

/** Overlays (only one at a time). */
export type OverlayKind =
  'menu' | 'filter' | 'food' | 'review' | 'address' | 'confirm' | 'delconfirm' | 'dlg';

export interface Overlay {
  kind: OverlayKind;
  props?: Record<string, unknown>;
  /** Overlay to restore when this one closes (e.g. review opened from the food sheet). */
  parent?: Overlay | null;
}
