import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { OfferAlert } from '..';

const meta = {
  title: 'Courier/OfferAlert',
  component: OfferAlert,
  parameters: { app: 'courier', frame: 'full' },
  args: {
    offer: { ...{
    rest: 'کبابی سنتی زاگرس',
    earn: '۶۸٬۰۰۰ تومان',
    from: 'شهرضا، خیابان امام',
    to: 'شهرضا، خیابان شریعتی',
    dist: '۲٫۴ کیلومتر',
    time: '۱۲ دقیقه',
    pay: 'نقدی · دریافت از مشتری',
    cash: true,
  }, d1: '۰٫۸ کیلومتر تا شما', d2: '۲٫۴ کیلومتر مسیر' },
    timerText: '۲۴',
    progress: 0.8,
    onAccept: fn(),
    onReject: fn(),
  },
} satisfies Meta<typeof OfferAlert>;
export default meta;
type S = StoryObj<typeof meta>;

export const Default: S = {};
export const AlmostOver: S = { args: { timerText: '۳', progress: 0.1 } };
export const Accepting: S = { args: { busy: true } };
