import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CartItemRow } from './CartItemRow';
import { FoodCard } from './FoodCard';
import { FoodDetails } from './FoodDetails';
import { ListRow } from './ListRow';

// KAN-110 (D-131): food discount on the customer components.
const discount = { percent: 10, badge: '۱۰٪ تخفیف' };
const sr = 'قیمت قبلی ۳۰۰٬۰۰۰، قیمت با ۱۰٪ تخفیف ۲۷۰٬۰۰۰ تومان';

describe('FoodCard', () => {
  it('shows the struck old price, the new price and the red badge', () => {
    render(<FoodCard f={{ name: 'کوبیده', price: 270000, oldPrice: 300000, discount }} />);
    expect(screen.getByText('۱۰٪ تخفیف')).toBeInTheDocument();
    expect(screen.getByText('۳۰۰٬۰۰۰').tagName).toBe('S');
    expect(screen.getByText(sr)).toBeInTheDocument();
  });

  it('keeps the server badge next to the discount badge', () => {
    render(
      <FoodCard
        f={{
          name: 'برگر',
          price: 234000,
          oldPrice: 260000,
          badge: 'پرفروش',
          discount: { ...discount, badge: 'جشنواره ۱۰٪' },
        }}
      />,
    );
    expect(screen.getByText('جشنواره ۱۰٪')).toBeInTheDocument();
    expect(screen.getByText('پرفروش')).toBeInTheDocument();
  });

  it('without a discount there is no badge and no struck price', () => {
    const { container } = render(<FoodCard f={{ name: 'دوغ', price: 25000 }} />);
    expect(screen.queryByText(/تخفیف|جشنواره/)).not.toBeInTheDocument();
    expect(container.querySelector('s')).toBeNull();
  });
});

describe('FoodDetails', () => {
  const props = { qtyText: '۱', totalText: '۲۷۰٬۰۰۰', canAdd: true, onClose: () => {} };

  it('festival: badge next to the price and the end text under it', () => {
    render(
      <FoodDetails
        {...props}
        food={{
          name: 'برگر',
          price: 270000,
          oldPrice: 300000,
          discount: { percent: 10, badge: 'جشنواره ۱۰٪', ends: 'تا ۳ روز دیگر' },
        }}
      />,
    );
    expect(screen.getByText('جشنواره ۱۰٪')).toBeInTheDocument();
    expect(screen.getByText('تا ۳ روز دیگر')).toBeInTheDocument();
    expect(screen.getByText(sr)).toBeInTheDocument();
  });

  it('without a discount: no badge, no end text', () => {
    render(<FoodDetails {...props} food={{ name: 'دوغ', price: 25000 }} />);
    expect(screen.queryByText(/تخفیف|جشنواره|روز دیگر|پایان امروز/)).not.toBeInTheDocument();
  });
});

describe('search row and cart line', () => {
  it('search row: badge and struck old price', () => {
    render(<ListRow title="چیزبرگر" meta="۲۶۰٬۰۰۰ تومان" metaOld="۳۲۵٬۰۰۰" badge="جشنواره ۲۰٪" />);
    expect(screen.getByText('جشنواره ۲۰٪')).toBeInTheDocument();
    expect(screen.getByText('۳۲۵٬۰۰۰').closest('s')).not.toBeNull();
  });

  it('cart line: old total struck through', () => {
    render(<CartItemRow item={{ name: 'کوبیده', total: 540000, oldTotal: 600000 }} qtyText="۲" />);
    expect(screen.getByText('۶۰۰٬۰۰۰').closest('s')).not.toBeNull();
    render(<CartItemRow item={{ name: 'دوغ', total: 25000 }} qtyText="۱" />);
    expect(screen.getAllByText(/قیمت قبلی/)).toHaveLength(1);
  });
});
