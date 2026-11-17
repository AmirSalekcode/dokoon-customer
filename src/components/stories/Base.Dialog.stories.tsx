import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Dialog } from '../base/Dialog';

const meta = {
  title: 'Base/Dialog',
  component: Dialog,
  parameters: { frame: 'full', layout: 'fullscreen' },
  args: {
    title: 'سبد خرید قبلی خالی شود؟',
    text: 'سبد شما مربوط به «کباب‌سرای نقش‌جهان» است.',
    confirmLabel: 'خالی کردن سبد و ادامه',
    onConfirm: fn(),
    onCancel: fn(),
  },
  render: (a) => (
    <div style={{ position: 'relative', height: 640 }}>
      <Dialog {...a} />
    </div>
  ),
} satisfies Meta<typeof Dialog>;
export default meta;
type S = StoryObj<typeof meta>;

export const Confirm: S = {};
export const Destructive: S = {
  args: {
    title: 'آدرس «خانه» حذف شود؟',
    text: 'این کار قابل بازگشت نیست.',
    confirmLabel: 'حذف آدرس',
    danger: true,
  },
};
