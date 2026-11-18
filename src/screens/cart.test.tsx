import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthFlow } from '@/auth/flow';
import { useSession } from '@/auth/session';
import { useCart } from '@/cart/cart';
import { useNav } from '@/nav/nav';
import type { Route } from '@/nav/types';
import { CartScreen } from './CartScreen';

const route: Route = { key: 'cart', screen: 'cart', params: {} };
const top = () => useNav.getState().stack.at(-1)!;
const naghsh = { id: 'naghsh', name: 'کباب‌سرای نقش‌جهان' };
const barg = { foodId: 'n2', title: 'کباب برگ', unitPrice: 420000, options: [] };

beforeEach(() => {
  useSession.getState().clear();
  useCart.getState().clear();
  useAuthFlow.getState().reset();
  useNav.getState().resetTo('cart');
});

const summary = () => screen.findByRole('region', { name: 'خلاصه‌ی پرداخت' });

describe('<CartScreen /> — spec §3 cart', () => {
  it('empty cart → EmptyState with «رفتن به رستوران‌ها»', async () => {
    render(<CartScreen route={route} />);
    expect(screen.getByRole('heading', { name: 'سبد خرید شما خالی است' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'رفتن به رستوران‌ها' }));
    expect(top().screen).toBe('restaurants');
  });

  it('shows the restaurant, lines and server-quoted totals (items, delivery, payable)', async () => {
    useCart.getState().add(naghsh, barg);
    render(<CartScreen route={route} />);
    expect(screen.getByRole('heading', { name: 'کباب‌سرای نقش‌جهان' })).toBeInTheDocument();
    const s = await summary();
    await waitFor(() => expect(s).toHaveTextContent('هزینه‌ی ارسال۴۵٬۰۰۰ تومان'));
    expect(s).toHaveTextContent('جمع غذاها۴۲۰٬۰۰۰ تومان');
    expect(s).toHaveTextContent('مبلغ قابل پرداخت۴۶۵٬۰۰۰ تومان');
  });

  it('stepper updates totals; reaching zero removes the line (empty cart)', async () => {
    useCart.getState().add(naghsh, barg);
    render(<CartScreen route={route} />);
    await userEvent.click(screen.getByRole('button', { name: 'افزودن یک عدد کباب برگ' }));
    await waitFor(async () => expect(await summary()).toHaveTextContent('جمع غذاها۸۴۰٬۰۰۰ تومان'));
    await userEvent.click(screen.getByRole('button', { name: 'کم کردن یک عدد کباب برگ' }));
    await userEvent.click(screen.getByRole('button', { name: 'کم کردن یک عدد کباب برگ' }));
    expect(screen.getByRole('heading', { name: 'سبد خرید شما خالی است' })).toBeInTheDocument();
  });

  it('below the minimum order: disabled CTA + «تا حداقل سفارش … مانده»', async () => {
    useCart
      .getState()
      .add(
        { id: 'burger', name: 'برگر لاین' },
        { foodId: 'b1', title: 'چیزبرگر دوبل', unitPrice: 260000, options: [] },
      );
    render(<CartScreen route={route} />);
    expect(await screen.findByText('تا حداقل سفارش ۴۰٬۰۰۰ تومان مانده')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ادامه و تکمیل سفارش/ })).toBeDisabled();
    expect(await summary()).toHaveTextContent('هزینه‌ی ارسالرایگان');
  });

  it('promo code: valid → discount row; invalid → error message', async () => {
    useCart.getState().add(naghsh, barg);
    render(<CartScreen route={route} />);
    const input = screen.getByLabelText('کد تخفیف');
    await userEvent.type(input, 'nope');
    await userEvent.click(screen.getByRole('button', { name: 'اعمال' }));
    expect(await screen.findByText('کد تخفیف معتبر نیست')).toBeInTheDocument();
    await userEvent.clear(input);
    await userEvent.type(input, 'dokoon10');
    await userEvent.click(screen.getByRole('button', { name: 'اعمال' }));
    expect(await screen.findByText('کد تخفیف اعمال شد')).toBeInTheDocument();
    const s = await summary();
    expect(s).toHaveTextContent('تخفیف−۴۲٬۰۰۰ تومان');
    expect(s).toHaveTextContent('مبلغ قابل پرداخت۴۲۳٬۰۰۰ تومان');
    expect(useCart.getState().promoCode).toBe('DOKOON10');
  });

  it('the cart note is the only note and is kept in the shared cart', async () => {
    useCart.getState().add(naghsh, barg);
    render(<CartScreen route={route} />);
    await userEvent.type(screen.getByLabelText('یادداشت سفارش'), 'بدون پیاز');
    expect(useCart.getState().note).toBe('بدون پیاز');
  });

  it('unavailable items are flagged and block checkout', async () => {
    useCart.getState().add(naghsh, { foodId: 'n5', title: 'خورشت قیمه', unitPrice: 190000, options: [] });
    render(<CartScreen route={route} />);
    expect(await screen.findByText('غذاهای ناموجود را از سبد حذف کنید')).toBeInTheDocument();
    expect(within(screen.getByRole('listitem')).getByText('ناموجود')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ادامه و تکمیل سفارش/ })).toBeDisabled();
  });

  it('checkout: guest → login (intent checkout); logged in → checkout', async () => {
    useCart.getState().add(naghsh, barg);
    render(<CartScreen route={route} />);
    const go = screen.getByRole('button', { name: /ادامه و تکمیل سفارش/ });
    await waitFor(() => expect(go).toBeEnabled());
    await userEvent.click(go);
    expect(top().screen).toBe('login');
    expect(useAuthFlow.getState().intent).toEqual({ screen: 'checkout' });
    useNav.getState().back();
    useSession.getState().setSession({ accessToken: 'a', refreshToken: 'r' });
    await userEvent.click(go);
    expect(top().screen).toBe('checkout');
  });
});
