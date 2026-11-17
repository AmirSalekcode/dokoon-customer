import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { RestaurantCard } from '../library/RestaurantCard';
import { restaurantClosedVM, restaurantFreeVM, restaurantVM } from './fixtures';

const meta = {
  title: 'Library/RestaurantCard',
  component: RestaurantCard,
  args: { r: restaurantVM, onOpen: fn(), onFav: fn() },
} satisfies Meta<typeof RestaurantCard>;
export default meta;
type S = StoryObj<typeof meta>;
export const Favorite: S = {};
export const FreeDelivery: S = { args: { r: restaurantFreeVM } };
export const Closed: S = { args: { r: restaurantClosedVM } };
