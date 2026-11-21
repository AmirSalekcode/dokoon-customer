import type { ComponentType } from 'react';
import type { PanelScreen } from '../nav/nav';
import { LoginScreen } from './auth/LoginScreen';
import { RegDocsScreen } from './reg/RegDocsScreen';
import { RegScreen } from './reg/RegScreen';
import { RegStatusScreen } from './auth/RegStatusScreen';
import { ShiftScreen } from './auth/ShiftScreen';
import { SoundScreen } from './SoundScreen';
import { HelpScreen, PanelErrorScreen, type PanelScreenProps } from './StackScreens';
import { OrderScreen } from './orders/OrderScreen';
import { OrdersScreen } from './orders/OrdersScreen';
import { CatsScreen } from './menu/CatsScreen';
import { DishScreen } from './menu/DishScreen';
import { GroupScreen } from './menu/GroupScreen';
import { MenuScreen } from './menu/MenuScreen';
import { ReportsScreen } from './reports/ReportsScreen';
import { SettleScreen } from './reports/SettleScreen';
import { AccountScreen } from './account/AccountScreen';
import { DeliveryScreen } from './account/DeliveryScreen';
import { HoursScreen } from './account/HoursScreen';

const SCREENS: Record<PanelScreen, ComponentType<PanelScreenProps>> = {
  orders: OrdersScreen,
  order: OrderScreen,
  menu: MenuScreen,
  cats: CatsScreen,
  dish: DishScreen,
  group: GroupScreen,
  reports: ReportsScreen,
  settle: SettleScreen,
  account: AccountScreen,
  hours: HoursScreen,
  delivery: DeliveryScreen,
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
