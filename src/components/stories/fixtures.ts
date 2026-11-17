import { toFoodCardVM, toRestaurantCardVM, toRestaurantHeaderVM } from '@/features/viewmodels';
import * as D from '@/mocks/data';
import { ICONS } from '../primitives/Icon';

/** Story data comes from the same mock dataset + view-model mappers as the app. */
export const restaurantVM = toRestaurantCardVM(D.restaurantCards[0]);
export const restaurantFreeVM = toRestaurantCardVM(D.restaurantCards[1]);
export const restaurantClosedVM = toRestaurantCardVM(D.restaurantCards[2]);
export const headerVM = toRestaurantHeaderVM(D.restaurants[0]);
export const headerClosedVM = toRestaurantHeaderVM(D.restaurants[2]);
export const foodVM = toFoodCardVM(D.foods[0], { orderable: true, allowExtras: true });
export const foodGroupsVM = toFoodCardVM(D.foods[3], { orderable: true, allowExtras: false });
export const foodOffVM = toFoodCardVM(D.foods[2], { orderable: true, allowExtras: true });

export const menuGroups = [
  {
    id: 'g1',
    items: [
      { id: 'orders', label: 'سفارش‌ها', d: ICONS.bag, badge: '۱' },
      { id: 'favs', label: 'علاقه‌مندی‌ها', d: ICONS.heart },
      { id: 'addr', label: 'آدرس‌های من', d: ICONS.pin },
    ],
  },
  { id: 'g2', items: [{ id: 'out', label: 'خروج از حساب', d: ICONS.user, out: true }] },
];

export const steps = [
  { label: 'سفارش ثبت شد', sub: '۱۰:۳۰', state: 'done' as const },
  { label: 'تأیید رستوران', sub: '۱۰:۳۲', state: 'done' as const },
  { label: 'در حال آماده‌سازی', sub: 'حدود ۲۰ دقیقه', state: 'cur' as const },
  { label: 'در راه', state: 'todo' as const },
  { label: 'تحویل شد', state: 'todo' as const },
];
