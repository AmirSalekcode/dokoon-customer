import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '@/mocks/node';
import { useToast } from '@/ui/toast';
import { CourierApp } from '../../CourierApp';
import { markSignedOut, useCourierSession } from '../../api/session';
import { courierHandlers, resetCourierMockDb, SESSION_COOKIE } from '../../mocks/handlers';
import { docTypes } from '../../mocks/data';
import { useCourierNav } from '../../nav/nav';

// KAN-91 (CP-07): four-step courier registration — details, data-driven documents (sent at once),
// Sheba, submit → waiting page; 422 opens the step of the bad field; back walks the steps.
const NEW_PHONE = '09120000001';
const VALID_NID = '0012345679';
const VALID_SHEBA = 'IR062960000000100324200001';
const nav = () => useCourierNav.getState();
const screens = () => nav().stack.map((r) => r.screen);
const top = () => document.querySelector<HTMLElement>('main:not([hidden])')!;
const cta = (name: string | RegExp) => within(top()).getByRole('button', { name });
const file = (name: string, type: string, size = 1000) => new File([new Uint8Array(size)], name, { type });

beforeEach(() => {
  server.use(...courierHandlers);
  resetCourierMockDb();
  localStorage.clear();
  markSignedOut(false);
  useToast.setState({ toasts: [] });
  // The web session cookie of the verified new phone (jsdom's fetch keeps no cookie jar).
  const realFetch = globalThis.fetch.bind(globalThis);
  vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const req = new Request(input, init);
    req.headers.set('Cookie', `${SESSION_COOKIE}=c-9-${NEW_PHONE}`);
    return realFetch(req);
  });
  useCourierSession.getState().setSession({ status: 'new', name: '' });
  act(() => nav().resetTo('reg'));
});
afterEach(() => {
  vi.restoreAllMocks();
});

async function fillDetails(nid = VALID_NID) {
  await userEvent.type(within(top()).getByLabelText('نام و نام خانوادگی'), 'رضا احمدی');
  await userEvent.type(within(top()).getByLabelText('کد ملی'), nid);
  await userEvent.type(within(top()).getByLabelText('پلاک موتورسیکلت'), '۱۲۳ ۴۵۶۷۸');
}

async function upload(tile: RegExp, f = file('doc.jpg', 'image/jpeg')) {
  await userEvent.click(within(top()).getByRole('button', { name: tile }));
  await userEvent.upload(within(top()).getByTestId('doc-file'), f, { applyAccept: false });
}

async function uploadRequired() {
  for (const d of docTypes.filter((t) => t.required)) {
    await upload(new RegExp(d.label!));
    await waitFor(() =>
      expect(within(top()).getByRole('button', { name: new RegExp(d.label!) })).toHaveTextContent(
        'بارگذاری شد',
      ),
    );
  }
}

describe('step 1: details', () => {
  it('continue needs a full name, a valid national code (checksum) and a plate', async () => {
    render(<CourierApp />);
    expect(within(top()).getByRole('list', { name: 'مراحل ثبت‌نام' })).toBeInTheDocument();
    expect(cta('ادامه')).toBeDisabled();
    await fillDetails('0012345678');
    expect(within(top()).getByText('کد ملی درست نیست')).toBeInTheDocument();
    expect(cta('ادامه')).toBeDisabled();
    await userEvent.clear(within(top()).getByLabelText('کد ملی'));
    await userEvent.type(within(top()).getByLabelText('کد ملی'), '۰۰۱۲۳۴۵۶۷۹');
    expect(cta('ادامه')).toBeEnabled();
  });
});

describe('step 2: documents', () => {
  it('lists the server documents (never hard-coded); continue after every required one is sent', async () => {
    let sent: string[] = [];
    server.use(
      http.post('*/v1/c/documents/:type', ({ params }) => {
        sent = [...sent, String(params.type)];
        return new HttpResponse(null, { status: 202 });
      }),
    );
    render(<CourierApp />);
    await fillDetails();
    await userEvent.click(cta('ادامه'));
    for (const d of docTypes) expect(await within(top()).findByText(d.label!)).toBeInTheDocument();
    expect(within(top()).getByText(/اختیاری/)).toBeInTheDocument();
    expect(cta('ادامه')).toBeDisabled();
    await uploadRequired();
    expect(sent).toEqual(docTypes.filter((d) => d.required).map((d) => d.id));
    expect(cta('ادامه')).toBeEnabled();
  });

  it('a wrong file type or a too-large file is refused before sending', async () => {
    render(<CourierApp />);
    await fillDetails();
    await userEvent.click(cta('ادامه'));
    await within(top()).findByText('کارت ملی');
    await upload(/کارت ملی/, file('id.gif', 'image/gif'));
    await waitFor(() =>
      expect(useToast.getState().toasts.map((t) => t.text).join()).toMatch(/این نوع فایل پذیرفته نمی‌شود/),
    );
    await upload(/کارت ملی/, file('id.pdf', 'application/pdf', 11 * 1024 * 1024));
    await waitFor(() =>
      expect(useToast.getState().toasts.map((t) => t.text).join()).toMatch(/حجم فایل بیشتر از ۱۰ مگابایت/),
    );
    expect(within(top()).getByRole('button', { name: /کارت ملی/ })).not.toHaveTextContent('بارگذاری شد');
  });

  it('a failed document list shows an error with retry', async () => {
    let calls = 0;
    server.use(
      http.get('*/v1/c/doc-types', () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.json({ code: 'X', message: 'x' }, { status: 400 })
          : HttpResponse.json(docTypes);
      }),
    );
    render(<CourierApp />);
    await fillDetails();
    await userEvent.click(cta('ادامه'));
    await userEvent.click(await within(top()).findByRole('button', { name: 'تلاش دوباره' }));
    expect(await within(top()).findByText('کارت ملی')).toBeInTheDocument();
  });
});

describe('steps 3–4: Sheba and submit', () => {
  it('submits and lands on the waiting page; back is not the wizard any more', async () => {
    let body: unknown = null;
    server.use(
      http.post('*/v1/c/registration', async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 201 });
      }),
    );
    render(<CourierApp />);
    await fillDetails();
    await userEvent.click(cta('ادامه'));
    await within(top()).findByText('کارت ملی');
    await uploadRequired();
    await userEvent.click(cta('ادامه'));
    const shebaField = within(top()).getByLabelText('شماره‌ی شبا (برای تسویه‌حساب)');
    await userEvent.type(shebaField, 'IR062960000000100324200002');
    expect(within(top()).getByText(/شماره‌ی شبا درست نیست/)).toBeInTheDocument();
    await userEvent.clear(shebaField);
    await userEvent.type(shebaField, VALID_SHEBA.slice(2)); // the 24 digits alone are enough
    await userEvent.click(cta('ارسال برای بررسی'));
    expect(await within(top()).findByText('درخواست شما ثبت شد')).toBeInTheDocument();
    expect(body).toEqual({
      name: 'رضا احمدی',
      nationalId: VALID_NID,
      plate: '123 45678',
      sheba: VALID_SHEBA,
    });
    await userEvent.click(cta('مشاهده‌ی وضعیت ثبت‌نام'));
    expect(screens()).toEqual(['wait']);
    expect(screen.getByRole('heading', { name: 'حساب شما در انتظار تأیید است' })).toBeInTheDocument();
  });

  it('422 opens the step of the bad field with the server message', async () => {
    server.use(
      http.post('*/v1/c/registration', () =>
        HttpResponse.json(
          { code: 'VALIDATION', message: 'اطلاعات ثبت‌نام کامل نیست', fields: { nationalId: 'این کد ملی قبلاً ثبت شده' } },
          { status: 422 },
        ),
      ),
    );
    render(<CourierApp />);
    await fillDetails();
    await userEvent.click(cta('ادامه'));
    await within(top()).findByText('کارت ملی');
    await uploadRequired();
    await userEvent.click(cta('ادامه'));
    await userEvent.type(within(top()).getByLabelText('شماره‌ی شبا (برای تسویه‌حساب)'), VALID_SHEBA);
    await userEvent.click(cta('ارسال برای بررسی'));
    expect(await within(top()).findByText('این کد ملی قبلاً ثبت شده')).toBeInTheDocument();
    expect(within(top()).getByText('اطلاعات ثبت‌نام کامل نیست')).toBeInTheDocument();
    expect(within(top()).getByLabelText('کد ملی')).toBeInTheDocument();
    expect(cta('ادامه')).toBeDisabled(); // until the field is edited
  });
});

describe('back', () => {
  it('walks back through the steps (Android too) and from the first step leaves to login', async () => {
    render(<CourierApp />);
    await fillDetails();
    await userEvent.click(cta('ادامه'));
    await within(top()).findByText('کارت ملی');
    act(() => {
      expect(nav().handleSystemBack()).toBe('intercepted');
    });
    expect(within(top()).getByLabelText('نام و نام خانوادگی')).toHaveValue('رضا احمدی');
    await userEvent.click(within(top()).getByRole('button', { name: 'بازگشت' }));
    expect(screens()).toEqual(['login']);
  });
});
