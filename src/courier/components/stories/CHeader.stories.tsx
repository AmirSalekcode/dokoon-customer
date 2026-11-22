import type { Meta, StoryObj } from '@storybook/react-vite';
import { CHeader } from '..';

const meta = {
  title: 'Courier/CHeader',
  component: CHeader,
  parameters: { app: 'courier', frame: 'full' },
  args: { who: 'مهدی کریمی', sub: 'شهرضا · موتورسیکلت', earn: '۴۸۰٬۰۰۰ تومان' },
} satisfies Meta<typeof CHeader>;
export default meta;
type S = StoryObj<typeof meta>;

export const Default: S = {};
export const LongName: S = { args: { who: 'محمدحسین عبدالله‌زاده اصفهانی', earn: '۰ تومان' } };
