import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { SocialCard } from '../library/SocialCard';

const meta = {
  title: 'Library/SocialCard',
  component: SocialCard,
  args: {
    title: 'اینستاگرام',
    sub: 'عکس غذاها، جشنواره‌ها و کدهای تخفیف',
    handle: '@dokoon.app',
    d: 'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM17.2 6.8h.01',
    onOpen: fn(),
  },
} satisfies Meta<typeof SocialCard>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
