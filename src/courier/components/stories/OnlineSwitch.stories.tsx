import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { OnlineSwitch } from '..';

const meta = {
  title: 'Courier/OnlineSwitch',
  component: OnlineSwitch,
  parameters: { app: 'courier' },
  args: { online: false, note: 'برای دریافت سفارش آنلاین شوید', onFlip: fn() },
} satisfies Meta<typeof OnlineSwitch>;
export default meta;
type S = StoryObj<typeof meta>;

export const Offline: S = {};
export const Online: S = { args: { online: true, note: 'پیشنهادهای نزدیک برای شما فرستاده می‌شود' } };
export const Busy: S = { args: { busy: true } };
