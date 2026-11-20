import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatCard } from '../library/StatCard';

const meta = {
  title: 'Restaurant/StatCard',
  component: StatCard,
  args: { label: 'درآمد', value: '۴٬۸۵۰٬۰۰۰ تومان', sub: '۱۲٪ بیشتر از دیروز', tone: 'up', icon: 'wallet' },
  render: (a) => (
    <div style={{ width: 172 }}>
      <StatCard {...a} />
    </div>
  ),
} satisfies Meta<typeof StatCard>;
export default meta;
type S = StoryObj<typeof meta>;

export const Up: S = {};
export const Down: S = {
  args: { label: 'زمان آماده‌سازی', value: '۲۴ دقیقه', sub: '۲ دقیقه کندتر', tone: 'down', icon: 'clock' },
};
export const Neutral: S = {
  args: { label: 'تعداد سفارش', value: '۱۷', sub: 'مشابه دیروز', tone: undefined, icon: 'bag' },
};
