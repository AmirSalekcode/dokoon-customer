import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { server } from '@/mocks/node';
import { useToast } from '@/ui/toast';
import { db } from '../../mocks/db';
import { panelHandlers, resetPanelMockDb } from '../../mocks/handlers';
import { usePanelNav } from '../../nav/nav';
import { PanelShell } from '../../shell/PanelShell';
import { useMenu } from '../../state/menu';
import { useOrders } from '../../state/orders';
import { useRestaurant } from '../../state/restaurant';
import { signedIn, signedOut } from '../../test/session';

// KAN-66: menu tab (category tabs, instant availability with rollback) and the category manager.
beforeEach(() => {
  server.use(...panelHandlers);
  resetPanelMockDb();
  localStorage.clear();
  useToast.setState({ toasts: [] });
  useRestaurant.setState({ profile: null, status: 'idle', switching: false });
  useOrders.getState().reset();
  useMenu.getState().reset();
  usePanelNav.getState().resetTo('login');
});
afterEach(() => signedOut());

const toastText = () => useToast.getState().toasts[0]?.text;
const top = () => usePanelNav.getState().stack.at(-1)!;

async function openMenu() {
  signedIn();
  render(<PanelShell />);
  await screen.findByRole('heading', { level: 1, name: 'کبابی سنتی زاگرس' });
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'منو' }));
  await screen.findByRole('list', { name: 'غذاهای منو' });
  return user;
}
const rows = () => within(screen.getByRole('list', { name: 'غذاهای منو' })).getAllByRole('listitem');

describe('menu tab', () => {
  it('category tabs filter the dishes and show counts', async () => {
    const user = await openMenu();
    expect(screen.getByRole('tab', { name: 'همه ۷' })).toHaveAttribute('aria-selected', 'true');
    expect(rows()).toHaveLength(7);
    await user.click(screen.getByRole('tab', { name: 'چلوخورش ۲' }));
    expect(rows()).toHaveLength(2);
    expect(screen.getByRole('switch', { name: 'موجود بودن قیمه‌ی نثار' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    expect(screen.getByText('ناموجود')).toBeInTheDocument();
  });

  it('the availability switch saves at once and toasts', async () => {
    const user = await openMenu();
    const sw = screen.getByRole('switch', { name: 'موجود بودن چلوکباب کوبیده' });
    await user.click(sw);
    expect(sw).toHaveAttribute('aria-checked', 'false');
    await waitFor(() => expect(db.foods.find((f) => f.id === 'm1')?.available).toBe(false));
    expect(toastText()).toBe('«چلوکباب کوبیده» ناموجود شد');
  });

  it('a failed switch flips back with the server message', async () => {
    const user = await openMenu();
    server.use(
      http.patch('*/v1/r/foods/:id', () =>
        HttpResponse.json({ code: 'X', message: 'تغییر ذخیره نشد' }, { status: 409 }),
      ),
    );
    const sw = screen.getByRole('switch', { name: 'موجود بودن چلوکباب کوبیده' });
    await user.click(sw);
    await waitFor(() => expect(toastText()).toBe('تغییر ذخیره نشد'));
    expect(sw).toHaveAttribute('aria-checked', 'true');
  });

  it('a dish opens its editor; back returns to the menu', async () => {
    const user = await openMenu();
    await user.click(screen.getByRole('button', { name: 'ویرایش چلوکباب کوبیده' }));
    expect(top()).toMatchObject({ screen: 'dish', params: { id: 'm1' } });
    await user.click(screen.getByRole('button', { name: 'بازگشت' }));
    expect(top().screen).toBe('menu');
  });

  it('load error shows a retry', async () => {
    server.use(
      http.get('*/v1/r/menu', () => HttpResponse.json({ code: 'X', message: 'x' }, { status: 429 })),
    );
    signedIn();
    render(<PanelShell />);
    await screen.findByRole('heading', { level: 1, name: 'کبابی سنتی زاگرس' });
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'منو' }));
    expect(await screen.findByText('منو دریافت نشد.')).toBeInTheDocument();
    server.use(...panelHandlers);
    await user.click(screen.getByRole('button', { name: 'تلاش دوباره' }));
    await screen.findByRole('list', { name: 'غذاهای منو' });
  });
});

describe('category manager', () => {
  it('renames and adds categories, then returns to the menu', async () => {
    const user = await openMenu();
    await user.click(screen.getByRole('button', { name: 'مدیریت دسته‌ها' }));
    await screen.findByRole('heading', { name: 'دسته‌بندی‌های منو' });
    const save = screen.getByRole('button', { name: 'ذخیره‌ی دسته‌ها' });
    expect(save).toBeDisabled();

    const first = screen.getByDisplayValue('کباب‌ها');
    await user.clear(first);
    await user.type(first, 'کباب ذغالی');
    await user.click(screen.getByRole('button', { name: 'افزودن دسته' }));
    await user.type(screen.getByLabelText('دسته‌ی تازه'), 'دسر');
    await user.click(save);

    await waitFor(() => expect(top().screen).toBe('menu'));
    expect(db.categories.map((c) => c.label)).toEqual(['کباب ذغالی', 'چلوخورش', 'پیش‌غذا و نوشیدنی', 'دسر']);
    expect(screen.getByRole('tab', { name: 'کباب ذغالی ۳' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'دسر' })).toBeInTheDocument();
  });

  it('an empty name blocks saving with an inline error', async () => {
    const user = await openMenu();
    await user.click(screen.getByRole('button', { name: 'مدیریت دسته‌ها' }));
    await user.click(screen.getByRole('button', { name: 'افزودن دسته' }));
    await user.click(screen.getByRole('button', { name: 'ذخیره‌ی دسته‌ها' }));
    expect(screen.getByText('نام دسته را بنویسید')).toBeInTheDocument();
    expect(db.categories).toHaveLength(3);
  });

  it('a category with dishes is not deleted; an empty one is', async () => {
    const user = await openMenu();
    await user.click(screen.getByRole('button', { name: 'مدیریت دسته‌ها' }));
    await user.click(screen.getByRole('button', { name: 'حذف دسته‌ی کباب‌ها' }));
    expect(toastText()).toBe('اول غذاهای این دسته را به دسته‌ی دیگری منتقل کنید');
    expect(screen.getByDisplayValue('کباب‌ها')).toBeInTheDocument();

    db.categories.push({ id: 'empty', label: 'خالی', sort: 9 });
    await useMenu.getState().load();
    await user.click(screen.getByRole('button', { name: 'بازگشت' }));
    await user.click(screen.getByRole('button', { name: 'مدیریت دسته‌ها' }));
    await user.click(await screen.findByRole('button', { name: 'حذف دسته‌ی خالی' }));
    await waitFor(() => expect(db.categories.some((c) => c.id === 'empty')).toBe(false));
    expect(screen.queryByDisplayValue('خالی')).not.toBeInTheDocument();
    expect(toastText()).toBe('دسته حذف شد');
  });
});
