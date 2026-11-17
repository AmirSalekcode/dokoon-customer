import type { Meta, StoryObj } from '@storybook/react-vite';
import { InfoList } from '../library/InfoList';

const meta = {
  title: 'Library/InfoList',
  component: InfoList,
  args: {
    rows: [
      { label: 'کد سفارش', value: '۱۰۲۵۴' },
      { label: 'روش پرداخت', value: 'نقدی هنگام تحویل' },
      { label: 'آدرس', value: 'شهرضا، خیابان امام' },
    ],
  },
} satisfies Meta<typeof InfoList>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
