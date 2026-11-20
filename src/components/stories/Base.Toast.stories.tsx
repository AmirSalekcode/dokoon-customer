import type { Meta, StoryObj } from '@storybook/react-vite';
import { Toast } from '../base/Toast';

const meta = { title: 'Base/Toast', component: Toast, args: { text: 'به سبد خرید اضافه شد' } } satisfies Meta<
  typeof Toast
>;
export default meta;
type S = StoryObj<typeof meta>;

export const Info: S = { args: { tone: 'info', text: 'برای خروج دوباره بزنید' } };
export const Success: S = { args: { tone: 'success' } };
export const ErrorTone: S = { args: { tone: 'error', text: 'ارسال ناموفق بود' } };
export const Warn: S = { args: { tone: 'warn', text: 'رستوران بسته شد' } };
