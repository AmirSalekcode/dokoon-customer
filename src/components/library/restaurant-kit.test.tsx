import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TextField } from '../base/TextField';
import { ToastHost } from '../base/Toast';
import { useToast, toast } from '@/ui/toast';
import { BarChart } from './BarChart';
import { ConfirmDialog } from './ConfirmDialog';
import { SegTabs } from './SegTabs';
import { StatCard } from './StatCard';
import { UploadTile } from './UploadTile';
import { WizardBar } from './WizardBar';

// KAN-57: shared components added for the restaurant app (restaurant component library §2).
// All texts/numbers come from props (data-driven); the parent formats Persian digits.

describe('SegTabs', () => {
  const items = [
    { key: 'new', label: 'جدید', count: '۲', hot: true },
    { key: 'prep', label: 'آماده‌سازی', count: '۱' },
    { key: 'history', label: 'تاریخچه' },
  ];

  it('is a tablist; the active tab is selected and the only one in the tab order', () => {
    render(<SegTabs label="وضعیت سفارش" items={items} active="prep" onPick={() => {}} />);
    expect(screen.getByRole('tablist', { name: 'وضعیت سفارش' })).toBeInTheDocument();
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false']);
    expect(tabs.map((t) => t.tabIndex)).toEqual([-1, 0, -1]);
    expect(tabs[0]).toHaveAccessibleName('جدید ۲');
  });

  it('marks a hot counter and omits empty counters', () => {
    render(<SegTabs label="x" items={items} active="new" onPick={() => {}} />);
    const [hot, , none] = screen.getAllByRole('tab');
    expect(hot.className).toMatch(/hot/);
    expect(none.querySelector('b')).toBeNull();
  });

  it('click and RTL arrow keys pick tabs', async () => {
    const onPick = vi.fn();
    render(<SegTabs label="x" items={items} active="prep" onPick={onPick} />);
    await userEvent.click(screen.getByRole('tab', { name: 'تاریخچه' }));
    expect(onPick).toHaveBeenLastCalledWith('history');
    screen.getByRole('tab', { name: /آماده‌سازی/ }).focus();
    await userEvent.keyboard('{ArrowLeft}'); // RTL: left = next
    expect(onPick).toHaveBeenLastCalledWith('history');
    await userEvent.keyboard('{ArrowRight}'); // focus moved to «تاریخچه»; right = previous
    expect(onPick).toHaveBeenLastCalledWith('prep');
    await userEvent.keyboard('{Home}');
    expect(onPick).toHaveBeenLastCalledWith('new');
    await userEvent.keyboard('{ArrowRight}'); // wraps around
    expect(onPick).toHaveBeenLastCalledWith('history');
  });
});

describe('WizardBar', () => {
  it('lists the steps with Persian numbers, checks done ones and marks the current step', () => {
    render(
      <WizardBar
        label="مراحل ثبت‌نام"
        steps={[
          { label: 'اطلاعات', state: 'done' },
          { label: 'مدارک', state: 'cur' },
          { label: 'شبا', state: 'todo' },
          { label: 'بررسی', state: 'todo' },
        ]}
      />,
    );
    const list = screen.getByRole('list', { name: 'مراحل ثبت‌نام' });
    const steps = screen.getAllByRole('listitem');
    expect(steps).toHaveLength(4);
    expect(steps[1]).toHaveAttribute('aria-current', 'step');
    expect(steps[0]).not.toHaveTextContent('۱');
    expect(steps[2]).toHaveTextContent('۳');
    expect(list).not.toHaveTextContent(/[0-9]/);
  });
});

describe('UploadTile', () => {
  it('is a button announcing its state; tapping calls onTap', async () => {
    const onTap = vi.fn();
    const { rerender } = render(<UploadTile label="مجوز کسب" sub="عکس یا PDF" onTap={onTap} />);
    const btn = screen.getByRole('button', { name: /مجوز کسب/ });
    expect(btn).toHaveAccessibleName('مجوز کسب، عکس یا PDF');
    await userEvent.click(btn);
    expect(onTap).toHaveBeenCalledOnce();
    rerender(<UploadTile label="مجوز کسب" sub="بارگذاری شد · تغییر" done onTap={onTap} />);
    expect(screen.getByRole('button').className).toMatch(/done/);
    rerender(<UploadTile label="مجوز کسب" sub="در حال بارگذاری" busy onTap={onTap} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button')).toBeDisabled();
  });
});

describe('StatCard', () => {
  it('shows label, value and comparison with its tone', () => {
    render(
      <StatCard label="درآمد" value="۴٬۸۵۰٬۰۰۰ تومان" sub="۱۲٪ بیشتر از دیروز" tone="up" icon="wallet" />,
    );
    expect(screen.getByText('درآمد')).toBeInTheDocument();
    expect(screen.getByText('۴٬۸۵۰٬۰۰۰ تومان')).toBeInTheDocument();
    expect(screen.getByText('۱۲٪ بیشتر از دیروز').className).toMatch(/up/);
  });
});

describe('BarChart', () => {
  const bars = [
    { label: 'ش', value: 14, valueText: '۱۴' },
    { label: 'ی', value: 28, valueText: '۲۸', on: true },
    { label: 'د', value: 0, valueText: '۰' },
  ];

  it('is an image with a text alternative listing every bar', () => {
    render(<BarChart title="سفارش‌های این هفته" bars={bars} />);
    expect(screen.getByRole('heading', { name: 'سفارش‌های این هفته' })).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAccessibleName('سفارش‌های این هفته: ش ۱۴، ی ۲۸، د ۰');
  });

  it('scales bars to the largest value (with a visible minimum) and highlights `on`', () => {
    const { container } = render(<BarChart title="x" bars={bars} />);
    const rects = [...container.querySelectorAll<HTMLElement>('[data-bar]')];
    expect(rects.map((r) => r.style.height)).toEqual(['50%', '100%', '3%']);
    expect(rects[1].parentElement!.className).toMatch(/on/);
  });

  it('copes with no data', () => {
    render(<BarChart title="x" bars={[]} empty="داده‌ای نیست" />);
    expect(screen.getByRole('img')).toHaveAccessibleName('x: داده‌ای نیست');
  });
});

describe('ConfirmDialog', () => {
  it('is an alert dialog; danger tone styles the confirm button; Escape cancels', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        title="رستوران بسته شود؟"
        text="تا باز کردن دوباره سفارش جدید نمی‌گیرید."
        confirmLabel="بستن رستوران"
        tone="danger"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    expect(screen.getByRole('alertdialog', { name: 'رستوران بسته شود؟' })).toBeInTheDocument();
    const ok = screen.getByRole('button', { name: 'بستن رستوران' });
    expect(ok.className).toMatch(/Danger/i);
    await userEvent.click(ok);
    expect(onConfirm).toHaveBeenCalledOnce();
    await userEvent.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalled();
  });
});

describe('Toast (restaurant: warn tone, 2.6 s, role=status)', () => {
  afterEach(() => {
    vi.useRealTimers();
    act(() => useToast.setState({ toasts: [] }));
  });

  it('announces politely and disappears after the given time', () => {
    vi.useFakeTimers();
    render(<ToastHost />);
    act(() => toast('رستوران بسته شد', 'warn', 2600));
    const host = screen.getByRole('status');
    expect(host).toHaveAttribute('aria-live', 'polite');
    expect(host).toHaveTextContent('رستوران بسته شد');
    expect(host.firstElementChild!.className).toMatch(/warn/);
    act(() => vi.advanceTimersByTime(2599));
    expect(host).toHaveTextContent('رستوران بسته شد');
    act(() => vi.advanceTimersByTime(1));
    expect(host).toBeEmptyDOMElement();
  });
});

describe('TextField (multi-purpose)', () => {
  it('suffix, ltr input and Persian-digit normalization of numeric fields', async () => {
    const onChange = vi.fn();
    render(<TextField label="قیمت" value="" onChange={onChange} suffix="تومان" numeric />);
    const input = screen.getByRole('textbox', { name: 'قیمت' });
    expect(screen.getByText('تومان')).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-describedby');
    await userEvent.type(input, '۲۵');
    expect(onChange).toHaveBeenLastCalledWith('5');
  });

  it('ltr text (Sheba) is left-to-right without being numeric', () => {
    render(<TextField label="شبا" value="IR12" onChange={() => {}} ltr />);
    expect(screen.getByRole('textbox', { name: 'شبا' })).toHaveAttribute('dir', 'ltr');
  });

  it('rows > 1 renders a multi-line textarea with the same label, hint and error', async () => {
    const onChange = vi.fn();
    render(<TextField label="پیام" value="" onChange={onChange} rows={4} error="حداقل ۱۰ حرف" />);
    const area = screen.getByRole('textbox', { name: 'پیام' });
    expect(area.tagName).toBe('TEXTAREA');
    expect(area).toHaveAttribute('rows', '4');
    expect(area).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('حداقل ۱۰ حرف');
    await userEvent.type(area, 'سلام');
    expect(onChange).toHaveBeenCalled();
  });
});
