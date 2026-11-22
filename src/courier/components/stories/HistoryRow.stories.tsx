import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { HistoryRow } from '..';

const meta = {
  title: 'Courier/HistoryRow',
  component: HistoryRow,
  parameters: { app: 'courier' },
  args: {
    order: {
      title: 'کبابی سنتی زاگرس ← خیابان شریعتی',
      sub: 'امروز · ۱۴:۲۰ · ۲٫۴ کیلومتر',
      earn: '۶۸٬۰۰۰ تومان',
      pay: 'نقدی',
    },
    onTap: fn(),
  },
} satisfies Meta<typeof HistoryRow>;
export default meta;
type S = StoryObj<typeof meta>;

export const Default: S = {};
export const LongTitle: S = {
  args: { order: { ...meta.args.order, title: 'سفره‌خانه سنتی باغ ایرانی ← کوی معلم، خیابان دوم، کوچه‌ی پنجم' } },
};
