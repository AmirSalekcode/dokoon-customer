import type { ComponentType } from 'react';
import type { Route, ScreenId } from '@/nav/types';
import { ErrorScreen } from './ErrorScreen';
import { HomeScreen } from './HomeScreen';
import { RestaurantScreen } from './RestaurantScreen';
import { RestInfoScreen } from './RestInfoScreen';
import { CartScreen } from './CartScreen';
import { CheckoutScreen } from './CheckoutScreen';
import { AddAddressScreen } from './AddAddressScreen';
import { PaidScreen } from './PaidScreen';
import { GatewayScreen } from './GatewayScreen';
import { PayFailScreen } from './PayFailScreen';
import { TrackScreen } from './order/TrackScreen';
import { CancelOrderScreen } from './order/CancelOrderScreen';
import { ReportScreen } from './order/ReportScreen';
import { RateOrderScreen } from './order/RateOrderScreen';
import { OrdersScreen } from './account/OrdersScreen';
import { EditProfileScreen } from './account/EditProfileScreen';
import { AddressesScreen } from './account/AddressesScreen';
import { FavoritesScreen } from './account/FavoritesScreen';
import { NotificationsScreen } from './account/NotificationsScreen';
import { PromosScreen } from './account/PromosScreen';
import { SettingsScreen } from './account/SettingsScreen';
import { SupportScreen } from './more/SupportScreen';
import { InviteScreen } from './more/InviteScreen';
import { SocialScreen } from './more/SocialScreen';
import { RateAppScreen } from './more/RateAppScreen';
import { AboutScreen } from './more/AboutScreen';
import { LegalScreen } from './more/LegalScreen';
import { ApplyScreen } from './more/ApplyScreen';
import { SoonScreen } from './more/SoonScreen';
import { AccountScreen } from './AccountScreen';
import { PlaceholderScreen } from './PlaceholderScreen';
import { SplashScreen } from './auth/SplashScreen';
import { OnboardScreen } from './auth/OnboardScreen';
import { CityScreen } from './auth/CityScreen';
import { LoginScreen } from './auth/LoginScreen';
import { OtpScreen } from './auth/OtpScreen';
import { SetupScreen } from './auth/SetupScreen';
import { PermsScreen } from './auth/PermsScreen';

export interface ScreenProps {
  route: Route;
}

/**
 * Phase 1 = foundation only. Home / restaurant / cart are thin demo screens that exercise the
 * API client, mock server, cart and navigation; full screens are built per spec in phase 2.
 */
const SCREENS: Partial<Record<ScreenId, ComponentType<ScreenProps>>> = {
  splash: SplashScreen,
  onboard: OnboardScreen,
  city: CityScreen,
  login: LoginScreen,
  otp: OtpScreen,
  setup: SetupScreen,
  perms: PermsScreen,
  home: HomeScreen,
  restaurant: RestaurantScreen,
  restinfo: RestInfoScreen,
  cart: CartScreen,
  checkout: CheckoutScreen,
  addaddr: AddAddressScreen,
  paid: PaidScreen,
  gateway: GatewayScreen,
  payfail: PayFailScreen,
  track: TrackScreen,
  cancel: CancelOrderScreen,
  report: ReportScreen,
  rateorder: RateOrderScreen,
  orders: OrdersScreen,
  editprof: EditProfileScreen,
  addresses: AddressesScreen,
  favs: FavoritesScreen,
  notifs: NotificationsScreen,
  promos: PromosScreen,
  account: AccountScreen,
  settings: SettingsScreen,
  support: SupportScreen,
  invite: InviteScreen,
  social: SocialScreen,
  rateapp: RateAppScreen,
  about: AboutScreen,
  legal: LegalScreen,
  apply: ApplyScreen,
  soon: SoonScreen,
  error: ErrorScreen,
};

/** Screens with a real implementation (each must have a k6 script in perf/pages/<id>.js). */
export const IMPLEMENTED_SCREENS = Object.keys(SCREENS) as ScreenId[];

export function screenFor(id: ScreenId): ComponentType<ScreenProps> {
  return SCREENS[id] ?? PlaceholderScreen;
}

/** Persian titles for the screens that are still placeholders (not in SCREENS yet). */
export const TITLES: Partial<Record<ScreenId, string>> = {
  restaurants: 'رستوران‌ها',
  offers: 'تخفیف‌ها',
  search: 'جستجو',
  campaign: 'کمپین',
};
