import type { Meta, StoryObj } from '@storybook/react-vite';
import { PriceSummary } from '../library/PriceSummary';

const meta = {
  title: 'Library/PriceSummary',
  component: PriceSummary,
  args: {
    rows: [
      { label: 'جمع غذاها', value: '۵۷۰٬۰۰۰ تومان' },
      { label: 'هزینه‌ی ارسال', value: '۴۵٬۰۰۰ تومان' },
      { label: 'تخفیف', value: '−۵۰٬۰۰۰ تومان', tone: 'good' },
    ],
    totalLabel: 'مبلغ قابل پرداخت',
    totalValue: '۵۶۵٬۰۰۰ تومان',
  },
} satisfies Meta<typeof PriceSummary>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
