import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { CouponCard } from '../library/CouponCard';

const meta = {
  title: 'Library/CouponCard',
  component: CouponCard,
  args: { badge: '۱۰٪', title: '۱۰٪ تخفیف دکون', sub: 'تا ۵۰ هزار تومان', code: 'DOKOON10', onUse: fn() },
} satisfies Meta<typeof CouponCard>;
export default meta;
type S = StoryObj<typeof meta>;
export const Default: S = {};
export const Copy: S = { args: { cta: 'کپی' } };
