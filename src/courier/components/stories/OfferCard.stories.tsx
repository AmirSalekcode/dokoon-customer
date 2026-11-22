import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { OfferCard } from '..';

const meta = {
  title: 'Courier/OfferCard',
  component: OfferCard,
  parameters: { app: 'courier' },
  args: { offer: {
    rest: 'کبابی سنتی زاگرس',
    earn: '۶۸٬۰۰۰ تومان',
    from: 'شهرضا، خیابان امام',
    to: 'شهرضا، خیابان شریعتی',
    dist: '۲٫۴ کیلومتر',
    time: '۱۲ دقیقه',
    pay: 'نقدی · دریافت از مشتری',
    cash: true,
  }, onOpen: fn() },
} satisfies Meta<typeof OfferCard>;
export default meta;
type S = StoryObj<typeof meta>;

export const Cash: S = {};
export const Online: S = {
  args: { offer: { ...meta.args.offer, cash: false, pay: 'پرداخت آنلاین', earn: '۵۲٬۰۰۰ تومان' } },
};
