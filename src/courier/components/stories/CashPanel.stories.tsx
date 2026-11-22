import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { CashPanel } from '..';

const meta = {
  title: 'Courier/CashPanel',
  component: CashPanel,
  parameters: { app: 'courier' },
  args: { due: '۴۱۲٬۰۰۰ تومان', value: '', onInput: fn(), onExact: fn() },
} satisfies Meta<typeof CashPanel>;
export default meta;
type S = StoryObj<typeof meta>;

export const Empty: S = {};
export const Exact: S = { args: { value: '۴۱۲٬۰۰۰' } };
export const Mismatch: S = {
  args: { value: '۴۰۰٬۰۰۰', error: '۱۲٬۰۰۰ تومان کمتر از مبلغ سفارش؛ ثبت می‌شود و مدیر شهر بررسی می‌کند' },
};
