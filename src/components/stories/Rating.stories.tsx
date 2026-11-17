import type { Meta, StoryObj } from '@storybook/react-vite';
import { Rating } from '../library/Rating';

const meta = {
  title: 'Library/Rating',
  component: Rating,
  args: { value: '۴٫۸', count: '۲۴۵' },
} satisfies Meta<typeof Rating>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
