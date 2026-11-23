import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  CashPanel,
  CHeader,
  DocStatusRow,
  EarnBalance,
  HistoryRow,
  ItemCheckRow,
  OfferAlert,
  OfferCard,
  OnlineSwitch,
  PermissionCard,
  PlaceCard,
  RouteMap,
  StageBar,
  TripSummary,
} from '.';

// KAN-88: the 14 courier components (courier component library). Every text and number comes from props
// (the screen formats Persian digits); roles and names are checked for screen readers.

const offer = {
  rest: 'پیتزا ماهان',
  earn: '۵۲٬۰۰۰ تومان',
  from: 'شهرضا، بلوار مدرس',
  to: 'شهرضا، خیابان ارم',
  dist: '۱٫۸ کیلومتر',
  time: '۹ دقیقه',
  pay: 'نقدی · دریافت از مشتری',
  cash: true,
};

describe('CHeader', () => {
  it('shows the logo, the courier tag, name, sub and today’s earnings from props', () => {
    render(<CHeader who="سارا کاظمی" sub="شهرضا · موتورسیکلت" earn="۱۲۰٬۰۰۰ تومان" />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'سارا کاظمی' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /دکون/ })).toBeInTheDocument();
    expect(screen.getByText('پیک')).toBeInTheDocument();
    expect(screen.getByText('۱۲۰٬۰۰۰ تومان')).toBeInTheDocument();
  });
});

describe('OnlineSwitch', () => {
  it('is a switch named by its state and described by the note', () => {
    const { rerender } = render(<OnlineSwitch online={false} note="برای دریافت سفارش آنلاین شوید" onFlip={() => {}} />);
    const sw = screen.getByRole('switch', { name: 'آفلاین هستید' });
    expect(sw).toHaveAttribute('aria-checked', 'false');
    expect(sw).toHaveAccessibleDescription('برای دریافت سفارش آنلاین شوید');
    rerender(<OnlineSwitch online note="پیشنهادها می‌رسد" onFlip={() => {}} />);
    expect(screen.getByRole('switch', { name: 'آنلاین هستید' })).toHaveAttribute('aria-checked', 'true');
  });

  it('flips on tap and Space; blocked while busy', async () => {
    const onFlip = vi.fn();
    const { rerender } = render(<OnlineSwitch online={false} note="" onFlip={onFlip} />);
    await userEvent.click(screen.getByRole('switch'));
    screen.getByRole('switch').focus();
    await userEvent.keyboard(' ');
    expect(onFlip).toHaveBeenCalledTimes(2);
    rerender(<OnlineSwitch online={false} note="" busy onFlip={onFlip} />);
    expect(screen.getByRole('switch')).toBeDisabled();
    expect(screen.getByRole('switch')).toHaveAttribute('aria-busy', 'true');
  });
});

describe('OfferCard', () => {
  it('reads restaurant, earnings, neighbourhoods and chips; opens on tap', async () => {
    const onOpen = vi.fn();
    render(<OfferCard offer={offer} onOpen={onOpen} />);
    const card = screen.getByRole('button');
    for (const t of ['پیتزا ماهان', '۵۲٬۰۰۰ تومان', 'شهرضا، بلوار مدرس', 'شهرضا، خیابان ارم', '۹ دقیقه'])
      expect(card).toHaveTextContent(t);
    // The label comes before each place so it is read «مبدأ … مقصد …».
    expect(card.textContent).toMatch(/مبدأشهرضا، بلوار مدرس.*مقصدشهرضا، خیابان ارم/);
    await userEvent.click(card);
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it('highlights a cash order only', () => {
    const { rerender } = render(<OfferCard offer={offer} onOpen={() => {}} />);
    expect(screen.getByText('نقدی · دریافت از مشتری').className).toMatch(/cash/);
    rerender(<OfferCard offer={{ ...offer, cash: false, pay: 'پرداخت آنلاین' }} onOpen={() => {}} />);
    expect(screen.getByText('پرداخت آنلاین').className).not.toMatch(/cash/);
  });
});

describe('OfferAlert', () => {
  const alertOffer = { ...offer, d1: '۱٫۲ کیلومتر تا شما', d2: '۱٫۸ کیلومتر مسیر' };

  it('is a modal alertdialog with a timer, focused on open', () => {
    render(<OfferAlert offer={alertOffer} timerText="۲۴" progress={0.8} onAccept={() => {}} onReject={() => {}} />);
    const dlg = screen.getByRole('alertdialog', { name: 'سفارش جدید برای شما' });
    expect(dlg).toHaveAttribute('aria-modal', 'true');
    expect(dlg).toHaveAccessibleDescription('پیتزا ماهان');
    expect(dlg).toHaveFocus();
    expect(screen.getByRole('timer', { name: '۲۴ ثانیه برای پاسخ' })).toBeInTheDocument();
    expect(dlg).toHaveTextContent('تحویل از رستوران · ۱٫۲ کیلومتر تا شما');
  });

  it('draws the ring from progress (clamped 0..1)', () => {
    const { container, rerender } = render(
      <OfferAlert offer={alertOffer} timerText="۳۰" progress={1} onAccept={() => {}} onReject={() => {}} />,
    );
    const ring = () => container.querySelectorAll('circle')[1];
    expect(Number(ring().getAttribute('stroke-dashoffset'))).toBe(0);
    rerender(<OfferAlert offer={alertOffer} timerText="۰" progress={-2} onAccept={() => {}} onReject={() => {}} />);
    expect(Number(ring().getAttribute('stroke-dashoffset'))).toBeCloseTo(2 * Math.PI * 54);
  });

  it('accept / reject; Escape does not dismiss; both blocked while accepting', async () => {
    const onAccept = vi.fn();
    const onReject = vi.fn();
    const { rerender } = render(
      <OfferAlert offer={alertOffer} timerText="۲۰" progress={0.6} onAccept={onAccept} onReject={onReject} />,
    );
    await userEvent.keyboard('{Escape}');
    expect(onReject).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'قبول سفارش' }));
    await userEvent.click(screen.getByRole('button', { name: 'رد کردن' }));
    expect(onAccept).toHaveBeenCalledOnce();
    expect(onReject).toHaveBeenCalledOnce();
    rerender(
      <OfferAlert offer={alertOffer} timerText="۲۰" progress={0.6} busy onAccept={onAccept} onReject={onReject} />,
    );
    expect(screen.getByRole('button', { name: 'قبول سفارش' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'رد کردن' })).toBeDisabled();
  });
});

describe('RouteMap', () => {
  it('shows the leg, the tracking indicator and both navigation apps', async () => {
    const onNeshan = vi.fn();
    const onBalad = vi.fn();
    const { rerender } = render(
      <RouteMap label="تا رستوران" etaText="۶ دقیقه" distText="۱٫۲ کیلومتر" tracking onNeshan={onNeshan} onBalad={onBalad} />,
    );
    expect(screen.getByText('تا رستوران')).toBeInTheDocument();
    expect(screen.getByText(/۶ دقیقه · ۱٫۲ کیلومتر/)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('ردیابی فعال');
    await userEvent.click(screen.getByRole('button', { name: 'مسیریابی با نشان' }));
    await userEvent.click(screen.getByRole('button', { name: 'مسیریابی با بلد' }));
    expect(onNeshan).toHaveBeenCalledOnce();
    expect(onBalad).toHaveBeenCalledOnce();
    rerender(<RouteMap label="تا مشتری" etaText="" distText="" tracking={false} onNeshan={onNeshan} onBalad={onBalad} />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('the illustration has no green (owner rule)', () => {
    const css = readFileSync(path.join(__dirname, 'RouteMap.module.css'), 'utf8');
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(css).not.toMatch(/green|--success|--okbg/);
  });
});

describe('StageBar', () => {
  const stages = [
    { label: 'رستوران', state: 'done' as const },
    { label: 'تحویل‌گیری', state: 'cur' as const },
    { label: 'مشتری', state: 'todo' as const },
    { label: 'تحویل', state: 'todo' as const },
  ];

  it('is an ordered list; the current step is aria-current and every step says its state', () => {
    render(<StageBar stages={stages} />);
    const list = screen.getByRole('list', { name: 'مراحل تحویل' });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(4);
    expect(items.map((li) => li.getAttribute('aria-current'))).toEqual([null, 'step', null, null]);
    expect(items[0]).toHaveTextContent('رستوران، انجام شد');
    expect(items[1]).toHaveTextContent('تحویل‌گیری، مرحله‌ی فعلی');
    // Todo steps show their number in Persian digits.
    expect(items[2]).toHaveTextContent('۳');
  });
});

describe('PlaceCard', () => {
  it('is a named region with address, note, call and copy', async () => {
    const onCall = vi.fn();
    const onCopy = vi.fn();
    render(
      <PlaceCard
        title="زهرا نوری"
        kind="مشتری"
        address="خیابان شریعتی، کوچه ۷، پلاک ۱۴"
        extra="طبقه ۲، واحد ۴"
        canCall
        onCall={onCall}
        onCopy={onCopy}
      />,
    );
    const region = screen.getByRole('region', { name: 'زهرا نوری' });
    expect(region).toHaveTextContent('خیابان شریعتی، کوچه ۷، پلاک ۱۴');
    expect(region).toHaveTextContent('طبقه ۲، واحد ۴');
    await userEvent.click(screen.getByRole('button', { name: 'تماس با زهرا نوری' }));
    await userEvent.click(screen.getByRole('button', { name: 'کپی آدرس مشتری' }));
    expect(onCall).toHaveBeenCalledOnce();
    expect(onCopy).toHaveBeenCalledOnce();
  });

  it('hides calling when not allowed and the note when empty', () => {
    render(<PlaceCard title="کافه پاتوق" kind="رستوران" address="خیابان انقلاب" canCall={false} onCall={() => {}} onCopy={() => {}} />);
    expect(screen.queryByRole('button', { name: /تماس/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'کپی آدرس رستوران' })).toBeInTheDocument();
  });
});

describe('ItemCheckRow', () => {
  it('is a checkbox named by quantity, dish and options; toggles', async () => {
    const onToggle = vi.fn();
    const { rerender } = render(
      <ItemCheckRow item={{ q: '۲', name: 'چلوکباب کوبیده', opt: 'دوغ', checked: false }} onToggle={onToggle} />,
    );
    const box = screen.getByRole('checkbox', { name: '۲ عدد چلوکباب کوبیده، دوغ' });
    expect(box).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(box);
    expect(onToggle).toHaveBeenCalledOnce();
    rerender(<ItemCheckRow item={{ q: '۱', name: 'لاته', checked: true }} onToggle={onToggle} />);
    expect(screen.getByRole('checkbox', { name: '۱ عدد لاته' })).toHaveAttribute('aria-checked', 'true');
  });
});

describe('CashPanel', () => {
  it('labels the field, reports input and «exact»', async () => {
    const onInput = vi.fn();
    const onExact = vi.fn();
    render(<CashPanel due="۴۱۲٬۰۰۰ تومان" value="" onInput={onInput} onExact={onExact} />);
    expect(screen.getByText('۴۱۲٬۰۰۰ تومان')).toBeInTheDocument();
    const field = screen.getByRole('textbox', { name: 'مبلغی که دریافت کردید' });
    expect(field).toHaveAttribute('inputmode', 'numeric');
    fireEvent.change(field, { target: { value: '۴۰۰۰۰۰' } });
    expect(onInput).toHaveBeenCalledWith('۴۰۰۰۰۰');
    await userEvent.click(screen.getByRole('button', { name: 'مبلغ دقیق دریافت شد' }));
    expect(onExact).toHaveBeenCalledOnce();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('a mismatch is announced and linked to the field, but never disables anything', () => {
    render(
      <CashPanel due="۴۱۲٬۰۰۰ تومان" value="۴۰۰٬۰۰۰" error="۱۲٬۰۰۰ تومان کمتر از مبلغ سفارش" onInput={() => {}} onExact={() => {}} />,
    );
    const field = screen.getByRole('textbox');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAccessibleDescription('۱۲٬۰۰۰ تومان کمتر از مبلغ سفارش');
    expect(screen.getByRole('alert')).toHaveTextContent('کمتر از مبلغ سفارش');
    expect(screen.getByRole('button')).toBeEnabled();
  });
});

describe('TripSummary', () => {
  it('is focused on show, lists the rows and goes back to orders', async () => {
    const onDone = vi.fn();
    render(
      <TripSummary
        earn="۶۸٬۰۰۰ تومان"
        rows={[
          { label: 'سفارش', value: '#۴۸۲۱' },
          { label: 'نقد دریافتی', value: '۴۱۲٬۰۰۰ تومان' },
        ]}
        onDone={onDone}
      />,
    );
    const region = screen.getByRole('region', { name: 'سفارش تحویل شد، دست شما درد نکند' });
    expect(region).toHaveFocus();
    expect(screen.getByText('۶۸٬۰۰۰ تومان')).toBeInTheDocument();
    expect(screen.getAllByRole('term').map((t) => t.textContent)).toEqual(['سفارش', 'نقد دریافتی']);
    expect(screen.getAllByRole('definition')[1]).toHaveTextContent('۴۱۲٬۰۰۰ تومان');
    await userEvent.click(screen.getByRole('button', { name: 'بازگشت به سفارش‌ها' }));
    expect(onDone).toHaveBeenCalledOnce();
  });
});

describe('HistoryRow', () => {
  it('reads title, sub, earnings and payment; opens details', async () => {
    const onTap = vi.fn();
    render(
      <HistoryRow
        order={{ title: 'پیتزا ماهان ← خیابان ارم', sub: 'امروز · ۱۳:۰۵', earn: '۵۲٬۰۰۰ تومان', pay: 'آنلاین' }}
        onTap={onTap}
      />,
    );
    const row = screen.getByRole('button');
    for (const t of ['پیتزا ماهان ← خیابان ارم', 'امروز · ۱۳:۰۵', '۵۲٬۰۰۰ تومان', 'آنلاین']) expect(row).toHaveTextContent(t);
    await userEvent.click(row);
    expect(onTap).toHaveBeenCalledOnce();
  });
});

describe('EarnBalance', () => {
  it('is a named region with balance, cash held, owed by Dokoon and the note', () => {
    render(<EarnBalance balance="۱٬۳۲۰٬۰۰۰ تومان" cash="۵۹۸٬۰۰۰ تومان" dokoon="۷۲۲٬۰۰۰ تومان" note="اعداد نمونه است" />);
    const region = screen.getByRole('region', { name: 'مانده‌ی حساب' });
    expect(region).toHaveTextContent('۱٬۳۲۰٬۰۰۰ تومان');
    const terms = screen.getAllByRole('term').map((t) => t.textContent);
    expect(terms).toEqual(['نقدی در دست شما', 'طلب از دکون']);
    expect(screen.getAllByRole('definition').map((d) => d.textContent)).toEqual(['۵۹۸٬۰۰۰ تومان', '۷۲۲٬۰۰۰ تومان']);
    expect(region).toHaveTextContent('اعداد نمونه است');
  });

  it('hides «طلب از دکون» when it is not given', () => {
    render(<EarnBalance balance="۱ تومان" cash="۲ تومان" note="نمونه" />);
    expect(screen.getAllByRole('term').map((t) => t.textContent)).toEqual(['نقدی در دست شما']);
  });
});

describe('DocStatusRow', () => {
  it.each([
    ['ok', false],
    ['wait', false],
    ['bad', true],
  ] as const)('%s badge uses its status tone; renew shown = %s', async (status, canRenew) => {
    const onRenew = vi.fn();
    render(
      <DocStatusRow
        doc={{ label: 'بیمه‌نامه', sub: 'اعتبار تا ۱۴۰۵/۰۹', status, statusLabel: 'وضعیت', canRenew }}
        onRenew={onRenew}
      />,
    );
    expect(screen.getByText('وضعیت').className).toMatch(new RegExp(`\\b_?${status}`));
    const renew = screen.queryByRole('button', { name: 'بارگذاری مجدد بیمه‌نامه' });
    expect(!!renew).toBe(canRenew);
    if (renew) {
      await userEvent.click(renew);
      expect(onRenew).toHaveBeenCalledOnce();
    }
  });
});

describe('PermissionCard', () => {
  const perm = { title: 'موقعیت مکانی', text: 'برای پیشنهاد نزدیک‌ترین سفارش', d: 'M12 21s-6-5.5-6-10', granted: false };

  it('missing: «لازم است» and a grant button described by the reason', async () => {
    const onGrant = vi.fn();
    render(<PermissionCard perm={perm} onGrant={onGrant} />);
    expect(screen.getByRole('region', { name: 'موقعیت مکانی' })).toHaveTextContent('لازم است');
    const btn = screen.getByRole('button', { name: 'اجازه می‌دهم' });
    expect(btn).toHaveAccessibleDescription('برای پیشنهاد نزدیک‌ترین سفارش');
    await userEvent.click(btn);
    expect(onGrant).toHaveBeenCalledOnce();
  });

  it('granted: «فعال», no button; a custom cta is used when missing', () => {
    const { rerender } = render(<PermissionCard perm={{ ...perm, granted: true }} onGrant={() => {}} />);
    expect(screen.getByText('فعال')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
    rerender(<PermissionCard perm={{ ...perm, cta: 'باز کردن تنظیمات' }} onGrant={() => {}} />);
    expect(screen.getByRole('button', { name: 'باز کردن تنظیمات' })).toBeInTheDocument();
  });
});

describe('motion and colour rules (all courier component styles)', () => {
  const dir = __dirname;
  const files = readdirSync(dir).filter((f) => f.endsWith('.module.css'));

  it.each(files)('%s: every animation or transition is switched off under prefers-reduced-motion', (f) => {
    const css = readFileSync(path.join(dir, f), 'utf8');
    if (!/animation:|transition:/.test(css)) return;
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
  });

  it.each(files)('%s: no green and no raw colours', (f) => {
    const css = readFileSync(path.join(dir, f), 'utf8');
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i);
    expect(css).not.toMatch(/green|--success|--okbg/);
  });
});
