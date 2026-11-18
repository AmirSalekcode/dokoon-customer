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
import { AccountScreen } from './AccountScreen';
import { PlaceholderScreen } from './PlaceholderScreen';
import { FoundationLab } from './FoundationLab';
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
  account: AccountScreen,
  settings: FoundationLab,
  error: ErrorScreen,
};

/** Screens with a real implementation (each must have a k6 script in perf/pages/<id>.js). */
export const IMPLEMENTED_SCREENS = Object.keys(SCREENS) as ScreenId[];

export function screenFor(id: ScreenId): ComponentType<ScreenProps> {
  return SCREENS[id] ?? PlaceholderScreen;
}

/** Persian titles for placeholder screens. */
export const TITLES: Partial<Record<ScreenId, string>> = {
  restaurants: 'رستوران‌ها',
  offers: 'تخفیف‌ها',
  search: 'جستجو',
  login: 'ورود',
  orders: 'سفارش‌ها',
  support: 'پشتیبانی',
  restinfo: 'اطلاعات رستوران',
  checkout: 'تکمیل سفارش',
  favs: 'علاقه‌مندی‌ها',
  notifs: 'اعلان‌ها',
  addresses: 'آدرس‌های من',
  promos: 'کدهای تخفیف',
  about: 'درباره ما',
  invite: 'دعوت از دوستان',
  social: 'شبکه‌های اجتماعی',
  rateapp: 'امتیاز به دکون',
  apply: 'همکاری با دکون',
  settings: 'تنظیمات',
};
