import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { SegTabs } from '../library/SegTabs';

const meta = {
  title: 'Restaurant/SegTabs',
  component: SegTabs,
  args: {
    label: 'وضعیت سفارش',
    active: 'new',
    onPick: () => {},
    items: [
      { key: 'new', label: 'جدید', count: '۲', hot: true },
      { key: 'prep', label: 'در حال آماده‌سازی', count: '۱' },
      { key: 'ready', label: 'آماده/در مسیر', count: '۲' },
      { key: 'history', label: 'تاریخچه' },
    ],
  },
  render: (a) => {
    const [active, setActive] = useState(a.active);
    return <SegTabs {...a} active={active} onPick={setActive} />;
  },
} satisfies Meta<typeof SegTabs>;
export default meta;
type S = StoryObj<typeof meta>;

export const OrderTabs: S = {};
export const ReportPeriods: S = {
  args: {
    label: 'بازه‌ی گزارش',
    active: 'week',
    items: [
      { key: 'today', label: 'امروز' },
      { key: 'week', label: 'این هفته' },
      { key: 'month', label: 'این ماه' },
    ],
  },
};
