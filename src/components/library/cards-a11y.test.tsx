import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Campaign } from '@/api/types';
import { Banners } from '@/screens/home/Banners';
import { FoodCard } from './FoodCard';
import { RestaurantCard } from './RestaurantCard';

// Lighthouse accessibility findings (KAN-45): card titles sit under h2 section titles, so they
// must be h3 (heading-order); a carousel slide with role="group" must not be an <article>
// (aria-allowed-role).
describe('card and banner semantics (Lighthouse a11y)', () => {
  it('restaurant card title is an h3', () => {
    render(<RestaurantCard r={{ name: 'برگر لاین' }} />);
    expect(screen.getByRole('heading', { level: 3, name: 'برگر لاین' })).toBeInTheDocument();
  });

  it('food card title is an h3', () => {
    render(<FoodCard f={{ name: 'کباب برگ', price: 420000 }} />);
    expect(screen.getByRole('heading', { level: 3, name: 'کباب برگ' })).toBeInTheDocument();
  });

  it('banner slides are labelled groups, not articles', () => {
    const items = [
      { id: 'c1', title: 'کباب داغ', text: 'متن' },
      { id: 'c2', title: 'پیتزا', text: 'متن' },
    ] as unknown as Campaign[];
    const { container } = render(<Banners items={items} onOpen={() => {}} />);
    expect(container.querySelector('article')).toBeNull();
    expect(screen.getByRole('group', { name: 'کباب داغ' })).toBeInTheDocument();
  });
});
