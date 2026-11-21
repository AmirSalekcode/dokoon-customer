import type { Meta, StoryObj } from '@storybook/react-vite';
import { EarnBalance } from '..';

const meta = {
  title: 'Courier/EarnBalance',
  component: EarnBalance,
  parameters: { app: 'courier' },
  args: {
    balance: '۱٬۳۲۰٬۰۰۰ تومان',
    cash: '۵۹۸٬۰۰۰ تومان',
    dokoon: '۷۲۲٬۰۰۰ تومان',
    note: 'اعداد نمونه است؛ قانون تسویه‌ی نقد هنوز قطعی نشده.',
  },
} satisfies Meta<typeof EarnBalance>;
export default meta;
type S = StoryObj<typeof meta>;

export const Default: S = {};
