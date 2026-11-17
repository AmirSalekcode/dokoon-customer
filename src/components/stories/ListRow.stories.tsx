import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ListRow } from '../library/ListRow';
import { ICONS } from '../primitives/Icon';

const meta = {
  title: 'Library/ListRow',
  component: ListRow,
  args: {
    title: 'سفارش شما در حال آماده شدن است',
    sub: 'کباب‌سرای نقش‌جهان',
    meta: '۵ دقیقه پیش',
    onTap: fn(),
  },
} satisfies Meta<typeof ListRow>;
export default meta;
type S = StoryObj<typeof meta>;
export const WithArt: S = { args: { art: 'dk-chelo', dot: true } };
export const WithIcon: S = { args: { d: ICONS.pin, title: 'آدرس‌های من', sub: '۲ آدرس', meta: undefined } };
