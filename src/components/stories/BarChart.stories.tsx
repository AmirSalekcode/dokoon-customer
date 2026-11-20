import type { Meta, StoryObj } from '@storybook/react-vite';
import { BarChart } from '../library/BarChart';

const week = [14, 15, 12, 17, 19, 22, 13];
const days = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];
const fa = new Intl.NumberFormat('fa-IR');

const meta = {
  title: 'Restaurant/BarChart',
  component: BarChart,
  args: {
    title: 'سفارش‌های این هفته',
    bars: week.map((v, i) => ({ label: days[i], value: v, valueText: fa.format(v), on: i === 5 })),
  },
  render: (a) => (
    <div style={{ width: 358 }}>
      <BarChart {...a} />
    </div>
  ),
} satisfies Meta<typeof BarChart>;
export default meta;
type S = StoryObj<typeof meta>;

export const Week: S = {};
export const NoData: S = { args: { bars: [], empty: 'هنوز سفارشی ثبت نشده' } };
