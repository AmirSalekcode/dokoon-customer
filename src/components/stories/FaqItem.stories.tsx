import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { FaqItem } from '../library/FaqItem';

const meta = {
  title: 'Library/FaqItem',
  component: FaqItem,
  args: { q: 'چطور سفارش را پیگیری کنم؟', a: 'از تب «حساب» وارد «سفارش‌ها» شوید و روی سفارش فعال بزنید.' },
  render: (a) => {
    const [open, setOpen] = useState(!!a.open);
    return <FaqItem {...a} open={open} onToggle={() => setOpen(!open)} />;
  },
} satisfies Meta<typeof FaqItem>;
export default meta;
type S = StoryObj<typeof meta>;
export const Closed: S = {};
export const Open: S = { args: { open: true } };
