import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ItemCheckRow } from '..';

const meta = {
  title: 'Courier/ItemCheckRow',
  component: ItemCheckRow,
  parameters: { app: 'courier' },
  args: { item: { q: '۲', name: 'چلوکباب کوبیده', opt: 'دوغ', checked: false }, onToggle: fn() },
} satisfies Meta<typeof ItemCheckRow>;
export default meta;
type S = StoryObj<typeof meta>;

export const Unchecked: S = {};
export const Checked: S = { args: { item: { q: '۱', name: 'جوجه‌کباب', checked: true } } };
