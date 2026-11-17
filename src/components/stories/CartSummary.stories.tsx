import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { CartSummary } from '../library/CartSummary';

const meta = {
  title: 'Library/CartSummary',
  component: CartSummary,
  args: { count: '۳', total: '۸۵۵٬۰۰۰', onOpen: fn() },
} satisfies Meta<typeof CartSummary>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
