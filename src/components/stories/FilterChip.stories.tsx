import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { FilterChip } from '../library/FilterChip';

const meta = {
  title: 'Library/FilterChip',
  component: FilterChip,
  args: { label: 'باز است', onPick: fn() },
} satisfies Meta<typeof FilterChip>;
export default meta;
type S = StoryObj<typeof meta>;
export const Default: S = {};
export const Selected: S = { args: { selected: true } };
export const WithArt: S = { args: { label: 'پیتزا', art: 'dk-pizza' } };
