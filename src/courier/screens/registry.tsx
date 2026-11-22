import type { ComponentType } from 'react';
import type { CourierScreen } from '../nav/nav';
import { ErrorScreen } from './ErrorScreen';
import { AccountTab, EarnTab, OrdersTab } from './TabScreens';
import type { CourierScreenProps } from './types';

const SCREENS: Record<CourierScreen, ComponentType<CourierScreenProps>> = {
  orders: OrdersTab,
  earn: EarnTab,
  account: AccountTab,
  error: ErrorScreen,
};

export const courierScreenFor = (id: CourierScreen) => SCREENS[id];

/** Screens that show the tab bar / side rail (the three tab roots). */
export const SHELL_SCREENS: readonly CourierScreen[] = ['orders', 'earn', 'account'];
