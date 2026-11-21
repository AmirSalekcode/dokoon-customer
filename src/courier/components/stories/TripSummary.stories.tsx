import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { TripSummary } from '..';

const meta = {
  title: 'Courier/TripSummary',
  component: TripSummary,
  parameters: { app: 'courier' },
  args: {
    earn: '۶۸٬۰۰۰ تومان',
    rows: [
      { label: 'سفارش', value: '#۴۸۲۱' },
      { label: 'مسیر', value: '۲٫۴ کیلومتر' },
      { label: 'نقد دریافتی', value: '۴۱۲٬۰۰۰ تومان' },
    ],
    onDone: fn(),
  },
} satisfies Meta<typeof TripSummary>;
export default meta;
type S = StoryObj<typeof meta>;

export const Cash: S = {};
export const Online: S = { args: { earn: '۵۲٬۰۰۰ تومان', rows: [{ label: 'پرداخت', value: 'آنلاین' }] } };
