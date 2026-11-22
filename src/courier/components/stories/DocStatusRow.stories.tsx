import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { DocStatusRow } from '..';

const meta = {
  title: 'Courier/DocStatusRow',
  component: DocStatusRow,
  parameters: { app: 'courier' },
  args: {
    doc: { label: 'گواهینامه موتور', sub: 'اعتبار تا ۱۴۰۸/۰۳', status: 'ok', statusLabel: 'تأیید شده', canRenew: false },
    onRenew: fn(),
  },
} satisfies Meta<typeof DocStatusRow>;
export default meta;
type S = StoryObj<typeof meta>;

export const Approved: S = {};
export const InReview: S = {
  args: { doc: { label: 'کارت موتورسیکلت', sub: 'ارسال شد', status: 'wait', statusLabel: 'در حال بررسی', canRenew: false } },
};
export const Expiring: S = {
  args: { doc: { label: 'بیمه‌نامه شخص ثالث', sub: '۹ روز تا انقضا', status: 'bad', statusLabel: 'نزدیک انقضا', canRenew: true } },
};
