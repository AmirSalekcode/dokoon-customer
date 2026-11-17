import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Button } from '../base/Button';

const meta = {
  title: 'Base/Button',
  component: Button,
  args: { children: 'ثبت سفارش', onClick: fn() },
  argTypes: { variant: { control: 'inline-radio', options: ['primary', 'secondary', 'danger', 'ghost'] } },
} satisfies Meta<typeof Button>;
export default meta;
type S = StoryObj<typeof meta>;

export const Primary: S = {};
export const Secondary: S = { args: { variant: 'secondary' } };
export const Danger: S = { args: { variant: 'danger', children: 'حذف حساب' } };
export const Ghost: S = { args: { variant: 'ghost', children: 'انصراف' } };
export const Loading: S = { args: { loading: true } };
export const Disabled: S = { args: { disabled: true } };
export const BlockLarge: S = { args: { block: true, size: 'lg', icon: 'bag' } };
