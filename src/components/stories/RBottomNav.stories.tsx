import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { RBottomNav } from '../library/RBottomNav';

/** Shared tab bar / side rail of the restaurant and courier apps (KAN-87). The rail appears at ≥720px. */
const restaurantItems = [
  { key: 'orders', label: 'سفارش‌ها', d: 'M4 6h16M4 12h16M4 18h10', badge: '۲', badgeLabel: '۲ سفارش جدید' },
  { key: 'menu', label: 'منو', d: 'M5 4h14v16H5zM9 8h6M9 12h6' },
  { key: 'reports', label: 'گزارش', d: 'M5 19V9M12 19V5M19 19v-7' },
  { key: 'account', label: 'حساب', d: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20a8 8 0 0 1 16 0' },
];
const courierItems = [
  { key: 'orders', label: 'سفارش‌ها', d: 'M3 7h11v9H3zM14 10h4l3 3v3h-7' },
  { key: 'earn', label: 'درآمد', d: 'M4 7h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6' },
  { key: 'account', label: 'حساب', d: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20a8 8 0 0 1 16 0' },
];

const meta = {
  title: 'Shared/RBottomNav',
  component: RBottomNav,
  parameters: { app: 'restaurant' },
  args: { label: 'بخش‌های رستوران', items: restaurantItems, active: 'orders', onPick: fn() },
  render: (a) => (
    <div style={{ width: 358 }}>
      <RBottomNav {...a} />
    </div>
  ),
} satisfies Meta<typeof RBottomNav<string>>;
export default meta;
type S = StoryObj<typeof meta>;

export const Restaurant: S = {};
export const RestaurantMenuActive: S = { args: { active: 'menu' } };
export const Courier: S = {
  parameters: { app: 'courier' },
  args: { label: 'بخش‌های پیک', items: courierItems, active: 'orders' },
};
