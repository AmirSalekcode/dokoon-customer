import type { Meta, StoryObj } from '@storybook/react-vite';
import { ContactRow } from '../library/ContactRow';

const meta = {
  title: 'Library/ContactRow',
  component: ContactRow,
  args: { title: 'تماس تلفنی با پشتیبانی', sub: 'همه‌ی روزها از ۹ صبح تا ۱۱ شب', href: 'tel:+983100000000' },
} satisfies Meta<typeof ContactRow>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
