import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ConfirmDialog } from '../library/ConfirmDialog';

const meta = {
  title: 'Restaurant/ConfirmDialog',
  component: ConfirmDialog,
  parameters: { frame: 'full', layout: 'fullscreen' },
  args: {
    title: 'رستوران بسته شود؟',
    text: 'تا وقتی دوباره باز کنید، سفارش جدید دریافت نمی‌کنید.',
    confirmLabel: 'بستن رستوران',
    tone: 'danger',
    onConfirm: fn(),
    onCancel: fn(),
  },
  render: (a) => (
    <div style={{ position: 'relative', height: 640 }}>
      <ConfirmDialog {...a} />
    </div>
  ),
} satisfies Meta<typeof ConfirmDialog>;
export default meta;
type S = StoryObj<typeof meta>;

export const CloseRestaurant: S = {};
export const Ok: S = {
  args: {
    title: 'درخواست تغییر شبا ثبت شود؟',
    text: 'تا تأیید پشتیبانی، شبای فعلی استفاده می‌شود.',
    confirmLabel: 'ثبت درخواست',
    tone: 'ok',
  },
};
