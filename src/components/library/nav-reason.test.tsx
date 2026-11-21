import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RBottomNav, type RNavItem } from './RBottomNav';
import { ReasonSheet } from './ReasonSheet';
import { SheetConfirm } from './SheetParts';

// KAN-87: RBottomNav and ReasonSheet moved from the restaurant panel to the shared library (D-125) so the
// courier app reuses them. Data-driven, accessible, unchanged for the panel.

const items: RNavItem<'orders' | 'menu' | 'account'>[] = [
  { key: 'orders', label: 'سفارش‌ها', d: 'M4 4h16', badge: '۲', badgeLabel: '۲ سفارش جدید' },
  { key: 'menu', label: 'منو', d: 'M4 8h16' },
  { key: 'account', label: 'حساب', d: 'M4 12h16' },
];

describe('RBottomNav', () => {
  it('is a named navigation landmark; the active tab is marked as the current page', () => {
    render(<RBottomNav label="بخش‌های پیک" items={items} active="menu" onPick={() => {}} />);
    const nav = screen.getByRole('navigation', { name: 'بخش‌های پیک' });
    const buttons = Array.from(nav.querySelectorAll('button'));
    expect(buttons.map((b) => b.getAttribute('aria-current'))).toEqual([null, 'page', null]);
    expect(buttons.every((b) => b.type === 'button')).toBe(true);
  });

  it('speaks the badge with the label; the visual badge is hidden from screen readers', () => {
    render(<RBottomNav label="بخش‌های رستوران" items={items} active="orders" onPick={() => {}} />);
    expect(screen.getByRole('button', { name: 'سفارش‌ها، ۲ سفارش جدید' })).toBeInTheDocument();
    expect(screen.getByText('۲')).toHaveAttribute('aria-hidden', 'true');
    // No badge → the visible label is the name.
    expect(screen.getByRole('button', { name: 'منو' })).toBeInTheDocument();
  });

  it('tapping or pressing Enter on a tab picks it', async () => {
    const onPick = vi.fn();
    render(<RBottomNav label="x" items={items} active="orders" onPick={onPick} />);
    await userEvent.click(screen.getByRole('button', { name: 'حساب' }));
    screen.getByRole('button', { name: 'منو' }).focus();
    await userEvent.keyboard('{Enter}');
    expect(onPick.mock.calls).toEqual([['account'], ['menu']]);
  });
});

describe('ReasonSheet', () => {
  const reasons = [
    { id: 'r1', label: 'موتورم خراب شد', on: false },
    { id: 'r2', label: 'مسیر بسته است', on: true },
  ];
  const base = {
    title: 'دلیل انصراف',
    text: 'دلیل به مدیر شهر گزارش می‌شود.',
    items: reasons,
    confirmLabel: 'انصراف از سفارش',
    canConfirm: true,
    onPick: () => {},
    onConfirm: () => {},
    onClose: () => {},
  };

  it('is a named dialog with a radiogroup of reasons', () => {
    render(<ReasonSheet {...base} />);
    expect(screen.getByRole('dialog', { name: 'دلیل انصراف' })).toBeInTheDocument();
    const group = screen.getByRole('radiogroup', { name: 'دلیل انصراف' });
    const radios = screen.getAllByRole('radio');
    expect(group).toContainElement(radios[0]);
    expect(radios.map((r) => r.getAttribute('aria-checked'))).toEqual(['false', 'true']);
    expect(screen.getByText('دلیل به مدیر شهر گزارش می‌شود.')).toBeInTheDocument();
  });

  it('picks a reason, confirms, and closes with the labelled close button', async () => {
    const onPick = vi.fn();
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(<ReasonSheet {...base} onPick={onPick} onConfirm={onConfirm} onClose={onClose} />);
    await userEvent.click(screen.getByRole('radio', { name: 'موتورم خراب شد' }));
    await userEvent.click(screen.getByRole('button', { name: 'انصراف از سفارش' }));
    await userEvent.click(screen.getByRole('button', { name: 'بستن' }));
    expect(onPick).toHaveBeenCalledWith('r1');
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalled();
  });

  it('confirm is disabled until a reason is picked, and busy while sending', () => {
    const { rerender } = render(<ReasonSheet {...base} canConfirm={false} />);
    expect(screen.getByRole('button', { name: 'انصراف از سفارش' })).toBeDisabled();
    rerender(<ReasonSheet {...base} busy />);
    const btn = screen.getByRole('button', { name: 'انصراف از سفارش' });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
  });

  it('shows loading/error content instead of the list', () => {
    render(<ReasonSheet {...base} items={[]} status={<p>در حال بارگذاری</p>} />);
    expect(screen.queryByRole('radiogroup')).toBeNull();
    expect(screen.getByText('در حال بارگذاری')).toBeInTheDocument();
  });
});

describe('SheetConfirm', () => {
  it('adds the caller tone class and blocks taps while busy', async () => {
    const onClick = vi.fn();
    render(<SheetConfirm label="تأیید" disabled={false} busy className="tone" onClick={onClick} />);
    const btn = screen.getByRole('button', { name: 'تأیید' });
    expect(btn.className).toMatch(/tone/);
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });
});
