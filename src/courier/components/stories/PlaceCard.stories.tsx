import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { PlaceCard } from '..';

const meta = {
  title: 'Courier/PlaceCard',
  component: PlaceCard,
  parameters: { app: 'courier' },
  args: {
    title: 'زهرا نوری',
    kind: 'مشتری',
    address: 'خیابان شریعتی، کوچه ۷، پلاک ۱۴',
    extra: 'طبقه ۲، واحد ۴؛ زنگ را دوبار بزنید',
    canCall: true,
    onCall: fn(),
    onCopy: fn(),
  },
} satisfies Meta<typeof PlaceCard>;
export default meta;
type S = StoryObj<typeof meta>;

export const Customer: S = {};
export const Restaurant: S = {
  args: { title: 'کبابی سنتی زاگرس', kind: 'رستوران', address: 'شهرضا، خیابان امام، نبش کوچه ۱۲', extra: '' },
};
export const NoCall: S = { args: { canCall: false } };
