import type { ComponentType } from 'react';
import type { PanelScreen } from '../nav/nav';
import { LoginScreen } from './auth/LoginScreen';
import { RegDocsScreen } from './reg/RegDocsScreen';
import { RegScreen } from './reg/RegScreen';
import { RegStatusScreen } from './auth/RegStatusScreen';
import { ShiftScreen } from './auth/ShiftScreen';
import { SoundScreen } from './SoundScreen';
import { HelpScreen, PanelErrorScreen, type PanelScreenProps } from './StackScreens';
import { AccountScreen, MenuScreen, OrdersScreen, ReportsScreen } from './TabScreens';

const SCREENS: Record<PanelScreen, ComponentType<PanelScreenProps>> = {
  orders: OrdersScreen,
  menu: MenuScreen,
  reports: ReportsScreen,
  account: AccountScreen,
  help: HelpScreen,
  login: LoginScreen,
  reg: RegScreen,
  'reg-status': RegStatusScreen,
  'reg-docs': RegDocsScreen,
  shift: ShiftScreen,
  sound: SoundScreen,
  error: PanelErrorScreen,
};

export const panelScreenFor = (id: PanelScreen) => SCREENS[id];

/** Screens that show the business header + navigation (the four root tabs). */
export const SHELL_SCREENS: readonly PanelScreen[] = ['orders', 'menu', 'reports', 'account'];
