import { createStackNav } from '@/nav/createStackNav';

/**
 * Courier app screens. `boot` checks the session on start; `login` (phone → code), `reg` (registration,
 * KAN-91) and `wait` (approval pending / suspended) come before the tabs (KAN-90). Offers, the order steps,
 * and account sub-pages join this list in their own tasks; `hist`/`histd`/`settle`/`setd` = history, trip details,
 * settlements and one settlement (KAN-99);
 * `info`/`sheba` = «اطلاعات من» and the Sheba change request (KAN-100).
 */
export const COURIER_SCREENS = [
  'boot',
  'login',
  'reg',
  'wait',
  'perm',
  'orders',
  'order',
  'earn',
  'account',
  'hist',
  'histd',
  'settle',
  'setd',
  'info',
  'sheba',
  'error',
] as const;
export type CourierScreen = (typeof COURIER_SCREENS)[number];

/** Root tabs (courier screen-specs): switching resets the stack; back on earn/account goes to orders first. */
export type CourierTab = 'orders' | 'earn' | 'account';
export const COURIER_TABS: readonly CourierTab[] = ['orders', 'earn', 'account'];

/**
 * Overlays, one at a time (courier component library «الگوهای مشترک»):
 * `dlg` = ConfirmDialog, `sheet` = ReasonSheet, `alr` = the new-offer alert (plugged in by KAN-94).
 * Toasts are not overlays: they never block and live beside whatever is open.
 */
export type CourierOverlay = 'dlg' | 'sheet' | 'alr';

const nav = createStackNav<CourierScreen, CourierTab, CourierOverlay>({
  initial: 'boot',
  tabs: COURIER_TABS,
  home: 'orders',
  errorScreen: 'error',
});

export const useCourierNav = nav.useStore;
export const setCourierBackInterceptor = nav.setBackInterceptor;
export const isCourierTab = (s: string): s is CourierTab => (COURIER_TABS as readonly string[]).includes(s);
