import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { RouteMap } from '..';

const meta = {
  title: 'Courier/RouteMap',
  component: RouteMap,
  parameters: { app: 'courier' },
  args: {
    label: 'تا رستوران',
    etaText: '۶ دقیقه',
    distText: '۱٫۲ کیلومتر',
    tracking: true,
    onNeshan: fn(),
    onBalad: fn(),
  },
} satisfies Meta<typeof RouteMap>;
export default meta;
type S = StoryObj<typeof meta>;

export const ToRestaurant: S = {};
export const ToCustomer: S = { args: { label: 'تا مشتری', etaText: '۹ دقیقه', distText: '۲٫۴ کیلومتر' } };
