import type { ComponentType } from 'react';
import type { CourierScreen } from '../nav/nav';
import { ErrorScreen } from './ErrorScreen';
import { BootScreen } from './auth/BootScreen';
import { LoginScreen } from './auth/LoginScreen';
import { WaitScreen } from './auth/WaitScreen';
import { PermScreen } from './perm/PermScreen';
import { RegScreen } from './reg/RegScreen';
import { OrderScreen } from './orders/OrderScreen';
import { AccountTab, OrdersTab } from './TabScreens';
import { EarnScreen } from './earn/EarnScreen';
import { HistDetailScreen, HistScreen, SettleDetailScreen, SettleScreen } from './money/MoneyScreens';
import type { CourierScreenProps } from './types';

const SCREENS: Record<CourierScreen, ComponentType<CourierScreenProps>> = {
  boot: BootScreen,
  login: LoginScreen,
  reg: RegScreen,
  wait: WaitScreen,
  perm: PermScreen,
  orders: OrdersTab,
  order: OrderScreen,
  earn: EarnScreen,
  account: AccountTab,
  hist: HistScreen,
  histd: HistDetailScreen,
  settle: SettleScreen,
  setd: SettleDetailScreen,
  error: ErrorScreen,
};

export const courierScreenFor = (id: CourierScreen) => SCREENS[id];

/** Screens that show the tab bar / side rail (the three tab roots). */
export const SHELL_SCREENS: readonly CourierScreen[] = ['orders', 'earn', 'account'];
