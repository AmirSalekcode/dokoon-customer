import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useNav } from '@/nav/nav';
import type { Route } from '@/nav/types';
import { RestInfoScreen } from './RestInfoScreen';

const route = (id: string): Route => ({ key: `ri-${id}`, screen: 'restinfo', params: { restaurantId: id } });
const top = () => useNav.getState().stack.at(-1)!;

beforeEach(() => {
  useNav.getState().resetTo('home');
  useNav.getState().push('restaurant', { restaurantId: 'naghsh' });
  useNav.getState().push('restinfo', { restaurantId: 'naghsh' });
});

describe('<RestInfoScreen /> — spec §2 restinfo', () => {
  it('shows address, hours, rating and delivery conditions', async () => {
    render(<RestInfoScreen route={route('naghsh')} />);
    expect(screen.getByRole('status', { name: 'در حال بارگذاری' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 1, name: 'کباب‌سرای نقش‌جهان' })).toBeInTheDocument();
    const info = screen.getByRole('region', { name: 'مشخصات رستوران' });
    const row = (label: string) => within(info).getByText(label).closest('div')!;
    expect(row('نشانی')).toHaveTextContent('شهرضا، خیابان امام، نبش کوچه‌ی ۴');
    expect(row('ساعت کاری')).toHaveTextContent('۱۱:۰۰ تا ۲۳:۰۰');
    expect(row('امتیاز')).toHaveTextContent('۴٫۸ از ۵ (۲۴۵ نظر)');
    const delivery = screen.getByRole('region', { name: 'شرایط ارسال' });
    const drow = (label: string) => within(delivery).getByText(label).closest('div')!;
    expect(drow('زمان ارسال')).toHaveTextContent('۲۵ تا ۳۵ دقیقه');
    expect(drow('هزینه‌ی ارسال')).toHaveTextContent('۴۵٬۰۰۰ تومان');
    // No minimum order (owner decision D-89).
    expect(delivery).not.toHaveTextContent('حداقل سفارش');
    expect(drow('روش پرداخت')).toHaveTextContent('آنلاین و نقدی هنگام تحویل');
  });

  it('free delivery and online-only payment are stated plainly', async () => {
    render(<RestInfoScreen route={route('burger')} />);
    const delivery = await screen.findByRole('region', { name: 'شرایط ارسال' });
    expect(within(delivery).getByText('هزینه‌ی ارسال').closest('div')).toHaveTextContent('رایگان');
  });

  it('phone is a tel: contact link', async () => {
    render(<RestInfoScreen route={route('naghsh')} />);
    const call = await screen.findByRole('link', { name: /تماس با/ });
    expect(call).toHaveAttribute('href', 'tel:03100000001');
  });

  it('closed restaurant shows when it opens next', async () => {
    render(<RestInfoScreen route={route('cafe')} />);
    await screen.findByRole('heading', { level: 1, name: 'کافه گلستان' });
    expect(screen.getByRole('status')).toHaveTextContent('بسته است — بازشدن بعدی: فردا ساعت ۹:۰۰');
  });

  it('back returns to the restaurant', async () => {
    render(<RestInfoScreen route={route('naghsh')} />);
    await screen.findByRole('heading', { level: 1 });
    await userEvent.click(screen.getByRole('button', { name: 'بازگشت' }));
    expect(top()).toMatchObject({ screen: 'restaurant', params: { restaurantId: 'naghsh' } });
  });

  it('unknown restaurant → 404 page', async () => {
    render(<RestInfoScreen route={route('nope')} />);
    await waitFor(() => expect(top()).toMatchObject({ screen: 'error', params: { kind: 'e404' } }));
  });
});
