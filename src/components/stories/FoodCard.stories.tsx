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
