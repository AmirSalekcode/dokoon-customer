import type { ComponentType } from 'react';
import type { PanelScreen } from '../nav/nav';
import { HelpScreen, LoginScreen, PanelErrorScreen, type PanelScreenProps } from './StackScreens';
import { AccountScreen, MenuScreen, OrdersScreen, ReportsScreen } from './TabScreens';

const SCREENS: Record<PanelScreen, ComponentType<PanelScreenProps>> = {
  orders: OrdersScreen,
  menu: MenuScreen,
  reports: ReportsScreen,
  account: AccountScreen,
  help: HelpScreen,
  login: LoginScreen,
  error: PanelErrorScreen,
};

export const panelScreenFor = (id: PanelScreen) => SCREENS[id];

/** Screens that show the business header + navigation (the four root tabs). */
export const SHELL_SCREENS: readonly PanelScreen[] = ['orders', 'menu', 'reports', 'account'];
