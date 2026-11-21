import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { LoadingState } from '../library/LoadingState';
import { ReasonSheet } from '../library/ReasonSheet';

/** Shared reason picker (KAN-87): restaurant reject/cancel, courier withdraw / report a problem. */
const meta = {
  title: 'Shared/ReasonSheet',
  component: ReasonSheet,
  parameters: { app: 'restaurant', frame: 'full' },
  args: {
    title: 'دلیل رد سفارش',
    text: 'دلیل برای مشتری ارسال می‌شود و مبلغ آنلاین خودکار به او برمی‌گردد.',
    items: [
      { id: 'busy', label: 'رستوران شلوغ است', on: false },
      { id: 'out', label: 'یکی از غذاها تمام شده', on: true },
      { id: 'closing', label: 'نزدیک بسته شدن هستیم', on: false },
    ],
    confirmLabel: 'رد سفارش',
    canConfirm: true,
    onPick: fn(),
    onConfirm: fn(),
    onClose: fn(),
  },
} satisfies Meta<typeof ReasonSheet>;
export default meta;
type S = StoryObj<typeof meta>;

export const Restaurant: S = {};
export const NothingPicked: S = {
  args: { canConfirm: false, items: meta.args.items.map((x) => ({ ...x, on: false })) },
};
export const Sending: S = { args: { busy: true } };
export const Loading: S = {
  args: { items: [], canConfirm: false, status: <LoadingState variant="list" rows={3} /> },
};
export const CourierWithdraw: S = {
  parameters: { app: 'courier' },
  args: {
    title: 'دلیل انصراف از سفارش',
    text: 'فقط پیش از تحویل‌گرفتن غذا می‌توانید انصراف دهید. سفارش به پیک دیگری داده می‌شود.',
    items: [
      { id: 'bike', label: 'موتورم خراب شد', on: true },
      { id: 'road', label: 'مسیر بسته است', on: false },
      { id: 'personal', label: 'مشکل شخصی پیش آمد', on: false },
      { id: 'late', label: 'رستوران خیلی دیر آماده می‌کند', on: false },
    ],
    confirmLabel: 'انصراف از سفارش',
  },
};
