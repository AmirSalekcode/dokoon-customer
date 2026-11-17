import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { RestaurantHeader } from '../library/RestaurantHeader';
import { headerClosedVM, headerVM } from './fixtures';

const meta = {
  title: 'Library/RestaurantHeader',
  component: RestaurantHeader,
  parameters: { frame: 'full', layout: 'fullscreen' },
  args: { r: headerVM, onBack: fn(), onFav: fn(), onShare: fn() },
} satisfies Meta<typeof RestaurantHeader>;
export default meta;
type S = StoryObj<typeof meta>;
export const OpenWithOffer: S = {};
export const Closed: S = { args: { r: headerClosedVM } };
