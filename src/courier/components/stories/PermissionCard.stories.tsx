import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { PermissionCard } from '..';

const meta = {
  title: 'Courier/PermissionCard',
  component: PermissionCard,
  parameters: { app: 'courier' },
  args: {
    perm: {
      title: 'موقعیت مکانی',
      text: 'برای پیشنهاد نزدیک‌ترین سفارش و نمایش مسیر؛ فقط وقتی آنلاین هستید یا سفارش فعال دارید.',
      d: 'M12 21s-6-5.5-6-10a6 6 0 1 1 12 0c0 4.5-6 10-6 10zM12 8a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
      granted: false,
    },
    onGrant: fn(),
  },
} satisfies Meta<typeof PermissionCard>;
export default meta;
type S = StoryObj<typeof meta>;

export const Needed: S = {};
export const Granted: S = { args: { perm: { ...meta.args.perm, granted: true } } };
export const Battery: S = {
  args: {
    perm: {
      title: 'بهینه‌سازی باتری',
      text: 'تا اندروید برنامه را در پس‌زمینه نبندد و پیشنهادها دیر نرسد.',
      d: 'M7 6h9v14H7zM10 3h3',
      granted: false,
      cta: 'باز کردن تنظیمات',
    },
  },
};
