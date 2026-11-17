import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../base/Button';
import { EmptyState } from '../library/EmptyState';

const meta = {
  title: 'Library/EmptyState',
  component: EmptyState,
  args: { title: 'رستورانی پیدا نشد', text: 'فیلترها را تغییر دهید.' },
} satisfies Meta<typeof EmptyState>;
export default meta;
type S = StoryObj<typeof meta>;
export const Default: S = {};
export const WithAction: S = {
  args: { art: 'dk-burger', title: 'سبد خرید شما خالی است', action: <Button>رفتن به رستوران‌ها</Button> },
};
