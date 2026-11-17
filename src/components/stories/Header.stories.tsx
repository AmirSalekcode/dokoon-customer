import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Header } from '../library/Header';

const meta = {
  title: 'Library/Header',
  component: Header,
  parameters: { frame: 'full' },
  args: { address: 'شهرضا، خیابان امام، نبش کوچه‌ی ۴', onMenu: fn(), onAddress: fn() },
} satisfies Meta<typeof Header>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
