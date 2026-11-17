import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { FoodDetails } from '../library/FoodDetails';

const meta = {
  title: 'Library/FoodDetails',
  component: FoodDetails,
  parameters: { frame: 'full', layout: 'fullscreen' },
  args: {
    food: {
      name: 'چیزبرگر دوبل',
      restaurantName: 'برگر لاین',
      art: 'dk-burger',
      rating: '۴٫۶',
      reviewCount: '۶۱',
      price: 260000,
      desc: 'دو لایه گوشت، پنیر چدار، سس مخصوص',
      groups: [
        {
          id: 'fries',
          title: 'اندازه‌ی سیب‌زمینی',
          required: true,
          tag: 'الزامی',
          options: [
            { id: 's', name: 'کوچک', priceText: 'رایگان' },
            { id: 'm', name: 'متوسط', priceText: '+۲۰٬۰۰۰ تومان', selected: true },
          ],
        },
        {
          id: 'x',
          title: 'افزودنی‌ها',
          multi: true,
          tag: 'اختیاری، تا ۳ مورد',
          options: [{ id: 'c', name: 'پنیر اضافه', priceText: '+۲۰٬۰۰۰ تومان' }],
        },
      ],
      dist: [
        { n: '۵', pct: 86 },
        { n: '۴', pct: 9 },
        { n: '۳', pct: 3 },
        { n: '۲', pct: 1 },
        { n: '۱', pct: 1 },
      ],
      reviews: [
        { id: 'r1', initial: 'م', name: 'مریم', date: '۲ روز پیش', stars: 5, text: 'خیلی خوشمزه بود.' },
      ],
    },
    qtyText: '۱',
    totalText: '۲۸۰٬۰۰۰',
    canAdd: true,
    onClose: fn(),
    onInc: fn(),
    onDec: fn(),
    onAdd: fn(),
    onReview: fn(),
  },
  render: (a) => (
    <div style={{ position: 'relative', height: 760 }}>
      <FoodDetails {...a} />
    </div>
  ),
} satisfies Meta<typeof FoodDetails>;
export default meta;
type S = StoryObj<typeof meta>;
export const Default: S = {};
export const RequiredMissing: S = { args: { canAdd: false, ctaLabel: 'گزینه‌ی الزامی را انتخاب کنید' } };
