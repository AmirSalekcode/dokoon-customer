import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { TopBar } from '../library/TopBar';

const meta = {
  title: 'Library/TopBar',
  component: TopBar,
  parameters: { frame: 'full' },
  args: { title: 'آدرس‌های من', onBack: fn() },
} satisfies Meta<typeof TopBar>;
export default meta;
type S = StoryObj<typeof meta>;
export const Default: S = {};
export const WithAction: S = { args: { actionLabel: 'افزودن', onAction: fn() } };
export const Root: S = { args: { title: 'سبد خرید', onBack: undefined } };
