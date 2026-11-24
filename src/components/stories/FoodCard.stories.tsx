import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { FoodCard } from '../library/FoodCard';
import { foodGroupsVM, foodOffVM, foodVM } from './fixtures';

const meta = {
  title: 'Library/FoodCard',
  component: FoodCard,
  args: { f: foodVM, onOpen: fn(), onAdd: fn(), onInc: fn(), onDec: fn() },
} satisfies Meta<typeof FoodCard>;
export default meta;
type S = StoryObj<typeof meta>;
export const Default: S = {};
export const InCart: S = { args: { qtyText: '۲' } };
export const WithOptionsInCart: S = { args: { f: foodGroupsVM, qtyText: '۲' } };
export const Unavailable: S = { args: { f: foodOffVM } };
export const RestaurantClosed: S = { args: { f: { ...foodVM, orderable: false } } };
/** D-131: «تخفیف ویژه» — struck base price, discounted price, red badge from the view model. */
export const Discount: S = {
  args: { f: { ...foodVM, price: 285000, oldPrice: 320000, discount: { percent: 10, badge: '۱۰٪ تخفیف' } } },
};
/** D-131: «جشنواره», next to a server badge. */
export const Festival: S = {
  args: {
    f: {
      ...foodVM,
      price: 260000,
      oldPrice: 325000,
      badge: 'پرفروش',
      discount: { percent: 20, badge: 'جشنواره ۲۰٪' },
    },
  },
};
