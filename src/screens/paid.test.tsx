import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useNav } from '@/nav/nav';
import type { Route } from '@/nav/types';
import { PaidScreen } from './PaidScreen';

const nav = () => useNav.getState();
const top = () => nav().stack.at(-1)!;
const route = (method: string): Route => ({
  key: 'paid',
  screen: 'paid',
  params: { orderId: 'o9', number: '10301', method, total: '465000' },
});

beforeEach(() => {
  nav().resetTo('home');
  nav().push('paid', route('cash').params);
});

describe('<PaidScreen /> — spec §3 paid', () => {
  it('cash: «سفارش شما ثبت شد», order number and the amount due on delivery', () => {
    render(<PaidScreen route={route('cash')} />);
    expect(screen.getByRole('heading', { level: 1, name: 'سفارش شما ثبت شد' })).toBeInTheDocument();
    expect(screen.getByText('شماره‌ی سفارش: ۱۰۳۰۱')).toBeInTheDocument();
    expect(screen.getByText('مبلغ قابل پرداخت هنگام تحویل: ۴۶۵٬۰۰۰ تومان')).toBeInTheDocument();
  });

  it('online: «پرداخت موفق»', () => {
    render(<PaidScreen route={route('online')} />);
    expect(screen.getByText('پرداخت موفق')).toBeInTheDocument();
    expect(screen.queryByText(/هنگام تحویل/)).toBeNull();
  });

  it('«پیگیری سفارش» → track; «بازگشت به خانه» → home', async () => {
    render(<PaidScreen route={route('cash')} />);
    await userEvent.click(screen.getByRole('button', { name: 'پیگیری سفارش' }));
    expect(top()).toMatchObject({ screen: 'track', params: { orderId: 'o9' } });
    nav().back();
    await userEvent.click(screen.getByRole('button', { name: 'بازگشت به خانه' }));
    expect(nav().stack.map((r) => r.screen)).toEqual(['home']);
  });

  it('system back from paid goes home, not to checkout', () => {
    render(<PaidScreen route={route('cash')} />);
    nav().back();
    expect(nav().stack.map((r) => r.screen)).toEqual(['home']);
  });
});
