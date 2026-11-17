import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { CartItemRow } from '../library/CartItemRow';

const meta = {
  title: 'Library/CartItemRow',
  component: CartItemRow,
  args: {
    item: { name: 'چیزبرگر دوبل', art: 'dk-burger', optionsText: 'سیب‌زمینی متوسط', total: 560000 },
    qtyText: '۲',
    onInc: fn(),
    onDec: fn(),
  },
} satisfies Meta<typeof CartItemRow>;
export default meta;
type S = StoryObj<typeof meta>;
export const Default: S = {};
export const NoOptions: S = {
  args: { item: { name: 'کباب برگ', art: 'dk-kebab', total: 420000 }, qtyText: '۱' },
};
