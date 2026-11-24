import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { server } from '@/mocks/node';
import { useToast } from '@/ui/toast';
import { db } from '../../mocks/db';
import { panelHandlers, resetPanelMockDb } from '../../mocks/handlers';
import { usePanelNav } from '../../nav/nav';
import { PanelShell } from '../../shell/PanelShell';
import { useDish } from '../../state/dish';
import { useMenu } from '../../state/menu';
import { useOrders } from '../../state/orders';
import { useRestaurant } from '../../state/restaurant';
import { useSettings } from '../../state/settings';
import { signedIn, signedOut } from '../../test/session';

// KAN-67: dish editor (validation, save, delete, photo review) and option-group editor.
beforeEach(() => {
  server.use(...panelHandlers);
  resetPanelMockDb();
  localStorage.clear();
  useToast.setState({ toasts: [] });
  useRestaurant.setState({ profile: null, status: 'idle', switching: false });
  useOrders.getState().reset();
  useMenu.getState().reset();
  useSettings.getState().reset();
  useDish.getState().clear();
  usePanelNav.getState().resetTo('login');
});
afterEach(() => signedOut());

const toastText = () => useToast.getState().toasts[0]?.text;
const route = () => usePanelNav.getState().stack.at(-1)!;
const top = () => document.querySelector<HTMLElement>('main:not([hidden])')!;
const m1 = () => db.foods.find((f) => f.id === 'm1')!;

async function openMenu() {
  signedIn();
  render(<PanelShell />);
  await screen.findByRole('heading', { level: 1, name: 'کبابی سنتی زاگرس' });
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'منو' }));
  await screen.findByRole('list', { name: 'غذاهای منو' });
  return user;
}
async function editDish(name: string) {
  const user = await openMenu();
  await user.click(screen.getByRole('button', { name: `ویرایش ${name}` }));
  await screen.findByRole('heading', { name: 'ویرایش غذا' });
  return user;
}

describe('dish editor', () => {
  it('edits name and price, saves with PUT and returns to the menu', async () => {
    const user = await editDish('چلوکباب کوبیده');
    const name = within(top()).getByLabelText('نام غذا');
    expect(name).toHaveValue('چلوکباب کوبیده');
    await user.clear(name);
    await user.type(name, 'کوبیده‌ی ویژه');
    const price = within(top()).getByLabelText('قیمت');
    await user.clear(price);
    await user.type(price, '۲۹۹۰۰۰');
    await user.click(screen.getByRole('button', { name: 'ذخیره‌ی غذا' }));

    await waitFor(() => expect(route().screen).toBe('menu'));
    // D-131: price is the base price; the loaded discount is kept as it was.
    expect(m1()).toMatchObject({
      name: 'کوبیده‌ی ویژه',
      price: 299000,
      discount: { price: 285000, label: 'special', endsAt: null },
    });
    expect(m1()).not.toHaveProperty('oldPrice');
    expect(toastText()).toBe('تغییرات غذا ذخیره شد');
    expect(screen.getByRole('button', { name: 'ویرایش کوبیده‌ی ویژه' })).toBeInTheDocument();
  });

  it('a new dish shows inline errors before any request, then is created in the chosen category', async () => {
    const user = await openMenu();
    await user.click(screen.getByRole('tab', { name: /^چلوخورش/ }));
    await user.click(screen.getByRole('button', { name: 'افزودن غذا' }));
    await screen.findByRole('heading', { name: 'افزودن غذا' });
    await user.click(screen.getByRole('button', { name: 'ذخیره‌ی غذا' }));
    expect(screen.getByText('نام غذا حداقل ۲ حرف است')).toBeInTheDocument();
    expect(screen.getByText('قیمت را به تومان بنویسید')).toBeInTheDocument();
    expect(db.foods).toHaveLength(7);
    // Category from the tab the dish was added from.
    expect(within(top()).getByRole('button', { name: 'چلوخورش' })).toHaveAttribute('aria-pressed', 'true');

    await user.type(within(top()).getByLabelText('نام غذا'), 'خورش بادمجان');
    await user.type(within(top()).getByLabelText('قیمت'), '230000');
    await user.click(screen.getByRole('button', { name: 'ذخیره‌ی غذا' }));

    await waitFor(() => expect(db.foods).toHaveLength(8));
    expect(db.foods.at(-1)).toMatchObject({ name: 'خورش بادمجان', price: 230000, categoryId: 'chelo' });
    expect(toastText()).toBe('غذا به منو اضافه شد');
    expect(route().screen).toBe('menu');
  });

  it('delete asks first; cancel keeps the dish, confirm removes it', async () => {
    const user = await editDish('دوغ محلی');
    await user.click(screen.getByRole('button', { name: 'حذف این غذا' }));
    const dlg = screen.getByRole('alertdialog', { name: 'این غذا حذف شود؟' });
    await user.click(within(dlg).getByRole('button', { name: 'انصراف' }));
    expect(db.foods.some((f) => f.id === 'm7')).toBe(true);
    expect(route().screen).toBe('dish');

    await user.click(screen.getByRole('button', { name: 'حذف این غذا' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'حذف غذا' }));
    await waitFor(() => expect(route().screen).toBe('menu'));
    expect(db.foods.some((f) => f.id === 'm7')).toBe(false);
    expect(screen.queryByRole('button', { name: 'ویرایش دوغ محلی' })).not.toBeInTheDocument();
  });

  it('a photo goes to Dokoon review (pending) and the menu keeps the default art', async () => {
    const user = await editDish('جوجه‌کباب با استخوان');
    expect(within(top()).getByRole('button', { name: /عکس غذا.*بارگذاری عکس واقعی/ })).toBeInTheDocument();
    const f = new File([new Uint8Array(2000)], 'dish.jpg', { type: 'image/jpeg' });
    await user.upload(within(top()).getByTestId('dish-photo-file'), f);
    await waitFor(() => expect(db.foods.find((x) => x.id === 'm2')?.photo?.status).toBe('pending'));
    expect(within(top()).getByRole('button', { name: /در انتظار تأیید دکون/ })).toBeInTheDocument();
    expect(toastText()).toBe('عکس برای تأیید دکون فرستاده شد');
  });

  it('a wrong photo type is refused before upload', async () => {
    await editDish('جوجه‌کباب با استخوان');
    const f = new File(['%PDF'], 'menu.pdf', { type: 'application/pdf' });
    fireEvent.change(within(top()).getByTestId('dish-photo-file'), { target: { files: [f] } });
    await waitFor(() => expect(toastText()).toMatch(/این نوع فایل پذیرفته نمی‌شود/));
    expect(db.foods.find((x) => x.id === 'm2')?.photo?.status).toBe('none');
  });

  it('extras off: no option groups, a note points to the settings', async () => {
    db.settings.allowExtras = false;
    await editDish('چلوکباب کوبیده');
    expect(await screen.findByText(/افزودنی‌ها برای کل رستوران خاموش است/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'افزودن گروه گزینه' })).not.toBeInTheDocument();
  });
});

describe('option-group editor', () => {
  it('adds an option to a group, then the dish save sends it', async () => {
    const user = await editDish('چلوکباب کوبیده');
    const card = screen.getByRole('region', { name: 'گروه نوشیدنی' });
    expect(within(card).getByText('انتخاب ۱ مورد · اختیاری')).toBeInTheDocument();
    await user.click(within(card).getByRole('button', { name: 'افزودن گزینه به نوشیدنی' }));
    await screen.findByRole('heading', { name: 'ویرایش گروه گزینه' });
    expect(within(top()).getByLabelText('نام گزینه‌ی ۳')).toHaveValue('');
    await user.type(within(top()).getByLabelText('نام گزینه‌ی ۳'), 'آب معدنی');
    await user.type(within(top()).getByLabelText('قیمت گزینه‌ی ۳ (تومان)'), '۱۵۰۰۰');
    await user.click(screen.getByRole('button', { name: 'افزایش حداکثر تعداد انتخاب' }));
    await user.click(screen.getByRole('button', { name: 'ذخیره‌ی گروه' }));

    expect(route().screen).toBe('dish');
    const after = screen.getByRole('region', { name: 'گروه نوشیدنی' });
    expect(within(after).getByText('آب معدنی')).toBeInTheDocument();
    expect(within(after).getByText('+۱۵٬۰۰۰ تومان')).toBeInTheDocument();
    expect(within(after).getByText('تا ۲ مورد · اختیاری')).toBeInTheDocument();
    // Not on the server until the dish is saved.
    expect(m1().groups?.find((g) => g.id === 'drink')?.options).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'ذخیره‌ی غذا' }));
    await waitFor(() => expect(m1().groups?.find((g) => g.id === 'drink')?.options).toHaveLength(3));
    expect(m1().groups?.find((g) => g.id === 'drink')).toMatchObject({ max: 2 });
  });

  it('a new group needs a title and a named option; back discards it', async () => {
    const user = await editDish('سالاد شیرازی');
    await user.click(screen.getByRole('button', { name: 'افزودن گروه گزینه' }));
    await screen.findByRole('heading', { name: 'گروه گزینه‌ی تازه' });
    await user.click(screen.getByRole('button', { name: 'ذخیره‌ی گروه' }));
    expect(screen.getByText('عنوان گروه حداقل ۲ حرف است')).toBeInTheDocument();
    expect(screen.getByText('حداقل یک گزینه با نام لازم است')).toBeInTheDocument();
    await user.type(within(top()).getByLabelText('عنوان گروه'), 'سس');
    await user.type(within(top()).getByLabelText('نام گزینه‌ی ۱'), 'سس ماست');
    await user.click(screen.getByRole('switch', { name: 'انتخاب اجباری' }));
    await user.click(screen.getByRole('button', { name: 'ذخیره‌ی گروه' }));
    const card = screen.getByRole('region', { name: 'گروه سس' });
    expect(within(card).getByText('اجباری')).toBeInTheDocument();
    expect(within(card).getByText('رایگان')).toBeInTheDocument();
  });

  it('deleting a group asks first and returns to the dish', async () => {
    const user = await editDish('چلوکباب کوبیده');
    await user.click(screen.getByRole('button', { name: 'ویرایش گروه افزودنی‌ها' }));
    await user.click(await screen.findByRole('button', { name: 'حذف این گروه' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'حذف گروه' }));
    await waitFor(() => expect(route().screen).toBe('dish'));
    expect(screen.queryByRole('region', { name: 'گروه افزودنی‌ها' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'گروه نوع برنج' })).toBeInTheDocument();
  });
});

// KAN-109 (D-131): «تخفیف ویژه» in the dish editor and on the menu list.
describe('food discount', () => {
  const sw = () => within(top()).getByRole('switch', { name: 'تخفیف روی این غذا' });
  const save = (user: ReturnType<typeof userEvent.setup>) =>
    user.click(screen.getByRole('button', { name: 'ذخیره‌ی غذا' }));
  const m2 = () => db.foods.find((f) => f.id === 'm2')!;
  const rowOf = (name: string) =>
    screen.getByRole('button', { name: `ویرایش ${name}` }).closest('li') as HTMLElement;

  it('a 10% chip fills the price, shows the live preview and saves «جشنواره» for 3 days', async () => {
    const user = await editDish('جوجه‌کباب با استخوان'); // 265,000
    expect(sw()).toHaveAttribute('aria-checked', 'false');
    await user.click(sw());
    await user.click(within(top()).getByRole('button', { name: '۱۰٪' }));
    expect(within(top()).getByLabelText('قیمت با تخفیف')).toHaveValue('۲۳۸۰۰۰');
    expect(within(top()).getByText('۲۳۸٬۰۰۰ تومان')).toBeInTheDocument();
    expect(within(top()).getByText('۱۰٪ تخفیف')).toBeInTheDocument();
    await user.click(within(top()).getByRole('button', { name: 'جشنواره' }));
    expect(within(top()).getByText('جشنواره ۱۰٪')).toBeInTheDocument();
    await user.click(within(top()).getByRole('button', { name: '۳ روز' }));
    await save(user);

    await waitFor(() => expect(route().screen).toBe('menu'));
    expect(m2()).toMatchObject({ price: 265000, discount: { price: 238000, label: 'festival' } });
    const days = (Date.parse(m2().discount!.endsAt!) - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(2.99);
    // Menu row: struck base price, badge and end text.
    const row = rowOf('جوجه‌کباب با استخوان');
    expect(within(row).getByText('جشنواره ۱۰٪')).toBeInTheDocument();
    expect(within(row).getByText('تا ۳ روز دیگر')).toBeInTheDocument();
    expect(within(row).getByLabelText('قیمت قبلی ۲۶۵٬۰۰۰')).toBeInTheDocument();
  });

  it('a discounted price above the price is an inline error; nothing is sent', async () => {
    const user = await editDish('جوجه‌کباب با استخوان');
    await user.click(sw());
    await user.type(within(top()).getByLabelText('قیمت با تخفیف'), '300000');
    expect(within(top()).getByText('قیمت با تخفیف باید کمتر از قیمت اصلی باشد')).toBeInTheDocument();
    await save(user);
    expect(route().screen).toBe('dish');
    expect(m2().discount).toBeNull();
  });

  it('changing the price recomputes the percent; below the discount it is an error', async () => {
    const user = await editDish('چلوکباب کوبیده'); // 320,000 → 285,000
    expect(sw()).toHaveAttribute('aria-checked', 'true');
    expect(within(top()).getByText('۱۰٪ تخفیف')).toBeInTheDocument();
    const price = within(top()).getByLabelText('قیمت');
    await user.clear(price);
    await user.type(price, '570000');
    expect(within(top()).getByText('۵۰٪ تخفیف')).toBeInTheDocument();
    await user.clear(price);
    await user.type(price, '280000');
    expect(within(top()).getByText('قیمت با تخفیف باید کمتر از قیمت اصلی باشد')).toBeInTheDocument();
  });

  it('more than 50% asks first; «انصراف» keeps the editor, confirming saves', async () => {
    const user = await editDish('جوجه‌کباب با استخوان');
    await user.click(sw());
    await user.type(within(top()).getByLabelText('قیمت با تخفیف'), '100000'); // 62%
    await save(user);
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('تخفیف بیش از ۵۰٪ است؛ مطمئنید؟')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'انصراف' }));
    expect(route().screen).toBe('dish');
    expect(m2().discount).toBeNull();

    await save(user);
    const again = await screen.findByRole('alertdialog');
    await user.click(within(again).getByRole('button', { name: 'بله، ذخیره کن' }));
    await waitFor(() => expect(route().screen).toBe('menu'));
    expect(m2().discount).toMatchObject({ price: 100000, label: 'special', endsAt: null });
  });

  it('«تاریخ دلخواه» needs a day from the Jalali calendar', async () => {
    const user = await editDish('جوجه‌کباب با استخوان');
    await user.click(sw());
    await user.click(within(top()).getByRole('button', { name: '۲۰٪' }));
    await user.click(within(top()).getByRole('button', { name: 'تاریخ دلخواه' }));
    const cal = within(top()).getByRole('group', { name: 'روز پایان تخفیف' });
    await save(user);
    expect(screen.getByText('روز پایان تخفیف را انتخاب کنید')).toBeInTheDocument();
    await user.click(within(cal).getByRole('button', { name: 'ماه بعد' }));
    const day = within(cal)
      .getAllByRole('button', { pressed: false })
      .find((b) => !b.hasAttribute('disabled') && /^[۰-۹]+$/.test(b.textContent ?? ''))!;
    await user.click(day);
    expect(day).toHaveAttribute('aria-pressed', 'true');
    await save(user);
    await waitFor(() => expect(route().screen).toBe('menu'));
    // Ends at 23:59:59 Tehran (20:29:59 UTC) of the picked day.
    expect(m2().discount?.endsAt).toMatch(/T20:29:59\.000Z$/);
  });

  it('switching it off removes the discount', async () => {
    const user = await editDish('چلوکباب کوبیده');
    await user.click(sw());
    await save(user);
    await waitFor(() => expect(route().screen).toBe('menu'));
    expect(m1()).toMatchObject({ price: 320000, discount: null });
  });

  it('«پایان تخفیف» on the menu ends it at once; a failure rolls back with a toast', async () => {
    const user = await openMenu();
    await user.click(screen.getByRole('button', { name: 'پایان تخفیف چلوکباب کوبیده' }));
    expect(screen.queryByRole('button', { name: 'پایان تخفیف چلوکباب کوبیده' })).not.toBeInTheDocument();
    await waitFor(() => expect(m1().discount).toBeNull());
    expect(toastText()).toBe('تخفیف «چلوکباب کوبیده» تمام شد');

    useToast.setState({ toasts: [] });
    server.use(
      http.patch('*/v1/r/foods/:id', () => HttpResponse.json({ code: 'X', message: '' }, { status: 500 })),
    );
    await user.click(screen.getByRole('button', { name: 'پایان تخفیف چلوکباب برگ' }));
    await waitFor(() => expect(toastText()).toBe('تخفیف برداشته نشد؛ دوباره تلاش کنید'));
    expect(screen.getByRole('button', { name: 'پایان تخفیف چلوکباب برگ' })).toBeInTheDocument();
  });
});
