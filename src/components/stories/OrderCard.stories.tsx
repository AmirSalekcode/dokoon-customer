import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { OrderCard } from '../library/OrderCard';

const base = {
  art: 'dk-chelo',
  name: 'کباب‌سرای نقش‌جهان',
  no: '۱۰۲۵۴',
  date: 'امروز ۱۰:۳۰',
  items: '۲× چلو کباب کوبیده، ۱× دوغ محلی',
  footNote: 'پرداخت آنلاین',
  total: '۶۱۵٬۰۰۰',
};
const meta = {
  title: 'Library/OrderCard',
  component: OrderCard,
  args: {
    order: {
      ...base,
      statusLabel: 'در حال آماده‌سازی',
      statusTone: 'amber',
      actionLabel: 'پیگیری سفارش',
      primary: true,
    },
    onOpen: fn(),
    onAction: fn(),
  },
} satisfies Meta<typeof OrderCard>;
export default meta;
type S = StoryObj<typeof meta>;
export const Active: S = {};
export const Delivered: S = {
  args: { order: { ...base, statusLabel: 'تحویل شد', statusTone: 'green', actionLabel: 'سفارش مجدد' } },
};
export const Canceled: S = { args: { order: { ...base, statusLabel: 'لغو شد', statusTone: 'red' } } };
