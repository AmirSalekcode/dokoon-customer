import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { FilterSheet } from '../library/FilterSheet';

const meta = {
  title: 'Library/FilterSheet',
  component: FilterSheet,
  parameters: { frame: 'full', layout: 'fullscreen' },
  args: {
    sort: [
      { id: 'rec', label: 'پیشنهادی', selected: true },
      { id: 'rating', label: 'بیشترین امتیاز' },
      { id: 'eta', label: 'سریع‌ترین' },
    ],
    toggles: [
      { id: 'open', title: 'فقط باز', sub: 'رستوران‌هایی که الان سفارش می‌گیرند', on: true },
      { id: 'disc', title: 'تخفیف‌دار' },
    ],
    tags: [
      { id: 'kebab', label: 'کباب', art: 'dk-kebab', selected: true },
      { id: 'pizza', label: 'پیتزا', art: 'dk-pizza' },
    ],
    ratings: [
      { id: '4', label: '۴+' },
      { id: '45', label: '۴٫۵+' },
    ],
    countText: 'نمایش ۱۲ رستوران',
    onClear: fn(),
    onApply: fn(),
    onClose: fn(),
  },
  render: (a) => (
    <div style={{ position: 'relative', height: 700 }}>
      <FilterSheet {...a} />
    </div>
  ),
} satisfies Meta<typeof FilterSheet>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
