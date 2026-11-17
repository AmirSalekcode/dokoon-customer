import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { CategoryItem } from '../library/CategoryItem';

const meta = {
  title: 'Library/CategoryItem',
  component: CategoryItem,
  args: { title: 'فست‌فود', art: 'dk-burger', onPick: fn() },
} satisfies Meta<typeof CategoryItem>;
export default meta;
type S = StoryObj<typeof meta>;
export const Default: S = {};
export const Selected: S = { args: { selected: true, title: 'همه', art: 'dk-mix' } };
