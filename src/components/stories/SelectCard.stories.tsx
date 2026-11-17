import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { SelectCard } from '../library/SelectCard';
import { ICONS } from '../primitives/Icon';

const meta = {
  title: 'Library/SelectCard',
  component: SelectCard,
  args: {
    title: 'پرداخت آنلاین',
    sub: 'درگاه امن بانکی',
    icon: ICONS.card,
    radio: true,
    onPick: fn(),
    onAction: fn(),
  },
} satisfies Meta<typeof SelectCard>;
export default meta;
type S = StoryObj<typeof meta>;
export const Selected: S = { args: { selected: true } };
export const Unselected: S = {
  args: { title: 'نقدی هنگام تحویل', sub: 'به پیک پرداخت کنید', icon: ICONS.wallet },
};
export const WithAction: S = {
  args: { title: 'خانه', sub: 'شهرضا، خیابان امام', icon: ICONS.home, radio: false, actionLabel: 'تغییر' },
};
export const Disabled: S = {
  args: {
    title: 'نقدی هنگام تحویل',
    sub: 'این رستوران پرداخت نقدی ندارد',
    icon: ICONS.wallet,
    disabled: true,
  },
};
