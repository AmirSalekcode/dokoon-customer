import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { useSession } from '@/auth/session';
import { server } from '@/mocks/node';
import { useNav } from '@/nav/nav';
import { useToast } from '@/ui/toast';
import { OverlayHost } from './OverlayHost';

const nav = () => useNav.getState();
const openFood = (foodId: string, restaurantId = 'naghsh') =>
  nav().openOverlay({ kind: 'food', props: { foodId, restaurantId } });

beforeEach(() => {
  localStorage.clear();
  useSession.getState().clear();
  nav().resetTo('home');
  nav().push('restaurant', { restaurantId: 'naghsh' });
});

describe('food sheet reviews — spec §2 «نظرات همه‌ی غذاها»', () => {
  it('shows the average, star distribution and the first page of reviews', async () => {
    openFood('n1');
    render(<OverlayHost />);
    const list = await screen.findByRole('list', { name: 'نظرات کاربران' });
    expect(screen.getByText('از ۱۲۴ نظر')).toBeInTheDocument();
    const dist = screen.getByRole('list', { name: 'پراکندگی امتیازها' });
    expect(within(dist).getAllByRole('listitem')).toHaveLength(5);
    expect(within(dist).getAllByRole('listitem')[0]).toHaveAccessibleName('۵ ستاره: ۸۶٪');
    expect(within(list).getAllByRole('listitem')).toHaveLength(5);
    expect(within(list).getAllByRole('listitem')[0]).toHaveTextContent('مریم');
  });

  it('loads more reviews as the sheet scrolls, until the last page', async () => {
    openFood('n1');
    render(<OverlayHost />);
    const list = await screen.findByRole('list', { name: 'نظرات کاربران' });
    const body = screen.getByTestId('food-body');
    fireEvent.scroll(body);
    await waitFor(() => expect(within(list).getAllByRole('listitem')).toHaveLength(10));
    fireEvent.scroll(body);
    await waitFor(() => expect(within(list).getAllByRole('listitem')).toHaveLength(12));
    expect(screen.queryByLabelText('در حال بارگذاری نظرات')).toBeNull();
  });

  it('a food without reviews invites the first one', async () => {
    openFood('n5');
    render(<OverlayHost />);
    expect(await screen.findByText('هنوز نظری ثبت نشده است. اولین نفر باشید.')).toBeInTheDocument();
  });

  it('«ثبت نظر» as a guest goes to login', async () => {
    openFood('n1');
    render(<OverlayHost />);
    await screen.findByRole('list', { name: 'نظرات کاربران' });
    await userEvent.click(screen.getByRole('button', { name: 'ثبت نظر' }));
    expect(nav().overlay).toBeNull();
    expect(nav().stack.at(-1)!.screen).toBe('login');
  });

  it('logged in: stars are required, the review is posted, then the sheet returns', async () => {
    useSession.getState().setSession({ accessToken: 'a', refreshToken: 'r' });
    let body: unknown;
    server.use(
      http.post('*/v1/foods/n1/reviews', async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 201 });
      }),
    );
    openFood('n1');
    render(<OverlayHost />);
    await screen.findByRole('list', { name: 'نظرات کاربران' });
    await userEvent.click(screen.getByRole('button', { name: 'ثبت نظر' }));
    const sheet = await screen.findByRole('dialog', { name: 'ثبت نظر' });
    const submit = within(sheet).getByRole('button', { name: 'ثبت نظر' });
    expect(submit).toBeDisabled();
    await userEvent.click(within(sheet).getByRole('radio', { name: '۴ ستاره' }));
    await userEvent.type(within(sheet).getByLabelText('متن نظر (اختیاری)'), 'عالی بود');
    await userEvent.click(submit);
    await waitFor(() => expect(nav().overlay).toMatchObject({ kind: 'food' }));
    expect(body).toEqual({ stars: 4, text: 'عالی بود' });
    expect(useToast.getState().toasts[0]?.text).toBe('نظر شما ثبت شد');
  });

  it('a failed post keeps the review sheet open with an error', async () => {
    useSession.getState().setSession({ accessToken: 'a', refreshToken: 'r' });
    server.use(
      http.post('*/v1/foods/n1/reviews', () =>
        HttpResponse.json({ code: 'X', message: 'x' }, { status: 500 }),
      ),
    );
    openFood('n1');
    render(<OverlayHost />);
    await screen.findByRole('list', { name: 'نظرات کاربران' });
    await userEvent.click(screen.getByRole('button', { name: 'ثبت نظر' }));
    const sheet = await screen.findByRole('dialog', { name: 'ثبت نظر' });
    await userEvent.click(within(sheet).getByRole('radio', { name: '۵ ستاره' }));
    await userEvent.click(within(sheet).getByRole('button', { name: 'ثبت نظر' }));
    await waitFor(() =>
      expect(useToast.getState().toasts[0]?.text).toBe('ثبت نظر انجام نشد. دوباره تلاش کنید.'),
    );
    expect(nav().overlay).toMatchObject({ kind: 'review' });
  });
});
