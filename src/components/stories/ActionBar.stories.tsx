import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ActionBar } from '../library/ActionBar';

const meta = {
  title: 'Library/ActionBar',
  component: ActionBar,
  args: { label: 'ثبت و پرداخت', valueText: '۶۱۵٬۰۰۰ تومان', onTap: fn() },
} satisfies Meta<typeof ActionBar>;
export default meta;
type S = StoryObj<typeof meta>;
export const Default: S = {};
export const Disabled: S = { args: { disabled: true, label: 'غذاهای ناموجود را از سبد حذف کنید' } };
