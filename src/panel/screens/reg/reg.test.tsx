import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '@/mocks/node';
import { useToast } from '@/ui/toast';
import { usePanelSession } from '../../api/session';
import { panelHandlers, resetPanelMockDb } from '../../mocks/handlers';
import { usePanelNav } from '../../nav/nav';
import { PanelShell } from '../../shell/PanelShell';
import { useRestaurant } from '../../state/restaurant';
import { signedIn } from '../../test/session';

// KAN-60: 4-step registration wizard with data-driven documents, uploads and the Sheba checksum.
const NEW_PHONE = '09130000000';
const VALID_SHEBA = 'IR820540102680020817909002';

beforeEach(() => {
  server.use(...panelHandlers);
  resetPanelMockDb();
  localStorage.clear();
  useToast.setState({ toasts: [] });
  useRestaurant.setState({ profile: null, status: 'idle', switching: false });
  usePanelNav.getState().resetTo('login');
  vi.stubGlobal('navigator', {
    ...navigator,
    onLine: true,
    geolocation: {
      getCurrentPosition: (ok: PositionCallback) =>
        ok({ coords: { latitude: 32.01, longitude: 51.87 } } as GeolocationPosition),
    },
  });
});
afterEach(() => vi.unstubAllGlobals());

const screens = () => usePanelNav.getState().stack.map((r) => r.screen);
const top = () => screen.getByRole('main', { hidden: false });
const cta = (name: RegExp | string) => within(top()).getByRole('button', { name });
const file = (name: string, type: string, size = 1000) => new File([new Uint8Array(size)], name, { type });

async function openWizard() {
  signedIn('new' as never, NEW_PHONE, false);
  render(<PanelShell />);
  await screen.findByRole('list', { name: 'مراحل ثبت‌نام' });
  expect(screens()).toEqual(['reg']);
}

async function fillInfo() {
  await userEvent.type(within(top()).getByLabelText('نام رستوران'), 'کبابی تازه');
  await userEvent.type(within(top()).getByLabelText('آدرس رستوران'), 'شهرضا، خیابان امام، پلاک ۱۲');
  await userEvent.click(within(top()).getByRole('button', { name: 'موقعیت فعلی من' }));
  await screen.findByText(/محل رستوران ثبت شد/);
}

async function upload(tile: RegExp, f: File) {
  await userEvent.click(within(top()).getByRole('button', { name: tile }));
  await userEvent.upload(within(top()).getByTestId('doc-file'), f, { applyAccept: false });
}

describe('step 1: information', () => {
  it('continue needs name ≥ 2, address ≥ 8 and a map pin', async () => {
    await openWizard();
    const next = cta('ادامه');
    expect(next).toBeDisabled();
    await userEvent.type(within(top()).getByLabelText('نام رستوران'), 'ک');
    expect(screen.getByText('نام حداقل ۲ حرف باشد')).toBeInTheDocument();
    await userEvent.type(within(top()).getByLabelText('نام رستوران'), 'باب');
    await userEvent.type(within(top()).getByLabelText('آدرس رستوران'), 'شهرضا، خیابان امام');
    expect(next).toBeDisabled();
    await userEvent.click(within(top()).getByRole('button', { name: 'موقعیت فعلی من' }));
    await waitFor(() => expect(next).toBeEnabled());
  });
});

describe('step 2: documents', () => {
  it('lists the server documents; continue only after every required one is uploaded', async () => {
    await openWizard();
    await fillInfo();
    await userEvent.click(cta('ادامه'));
    expect(await within(top()).findByRole('button', { name: /مجوز کسب/ })).toBeInTheDocument();
    expect(within(top()).getByRole('button', { name: /کارت ملی مدیر/ })).toBeInTheDocument();
    expect(within(top()).getByRole('button', { name: /لوگو و عکس رستوران، اختیاری/ })).toBeInTheDocument();
    expect(cta('ادامه')).toBeDisabled();

    await upload(/مجوز کسب/, file('license.pdf', 'application/pdf'));
    expect(await within(top()).findByRole('button', { name: /مجوز کسب، بارگذاری شد/ })).toBeInTheDocument();
    expect(cta('ادامه')).toBeDisabled();
    await upload(/کارت ملی مدیر/, file('id.jpg', 'image/jpeg'));
    await within(top()).findByRole('button', { name: /کارت ملی مدیر، بارگذاری شد/ });
    expect(cta('ادامه')).toBeEnabled();
  });

  it('refuses a wrong type and a too large file with the server rule', async () => {
    await openWizard();
    await fillInfo();
    await userEvent.click(cta('ادامه'));
    await within(top()).findByRole('button', { name: /کارت ملی مدیر/ });
    await upload(/کارت ملی مدیر/, file('id.pdf', 'application/pdf'));
    expect(await screen.findByRole('status')).toHaveTextContent('فقط JPG، PNG');
    await upload(/کارت ملی مدیر/, file('id.jpg', 'image/jpeg', 6 * 1024 * 1024));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('بیشتر از ۵ مگابایت'));
    expect(within(top()).queryByRole('button', { name: /بارگذاری شد/ })).toBeNull();
  });
});

describe('step 3 + submit', () => {
  async function toSheba() {
    await openWizard();
    await fillInfo();
    await userEvent.click(cta('ادامه'));
    await within(top()).findByRole('button', { name: /مجوز کسب/ });
    await upload(/مجوز کسب/, file('license.pdf', 'application/pdf'));
    await within(top()).findByRole('button', { name: /مجوز کسب، بارگذاری شد/ });
    await upload(/کارت ملی مدیر/, file('id.jpg', 'image/jpeg'));
    await within(top()).findByRole('button', { name: /کارت ملی مدیر، بارگذاری شد/ });
    await userEvent.click(cta('ادامه'));
    return within(top()).getByLabelText('شماره‌ی شبا (برای تسویه‌حساب)');
  }

  it('Sheba is checked with the mod-97 checksum before sending', async () => {
    const field = await toSheba();
    await userEvent.type(field, 'IR062960000000100324200002');
    expect(screen.getByText(/شماره‌ی شبا درست نیست/)).toBeInTheDocument();
    expect(cta('ارسال برای بررسی')).toBeDisabled();
  });

  it('sends info, coordinates, normalized Sheba, cash and documents; then the status page', async () => {
    let body: Record<string, unknown> = {};
    server.use(
      http.post('*/v1/r/registration', async ({ request }) => {
        body = (await request.clone().json()) as Record<string, unknown>;
        return undefined; // the mock server records the registration
      }),
    );
    const field = await toSheba();
    await userEvent.type(field, VALID_SHEBA.slice(2).toLowerCase()); // 24 digits only, no «IR»
    await userEvent.click(within(top()).getByRole('switch', { name: /پرداخت در محل/ }));
    await userEvent.click(cta('ارسال برای بررسی'));
    expect(await within(top()).findByRole('heading', { name: 'درخواست شما ثبت شد' })).toBeInTheDocument();
    expect(body).toMatchObject({
      name: 'کبابی تازه',
      address: 'شهرضا، خیابان امام، پلاک ۱۲',
      lat: 32.01,
      lng: 51.87,
      sheba: VALID_SHEBA,
      allowCash: false,
    });
    expect((body.docs as { docTypeId: string }[]).map((d) => d.docTypeId).sort()).toEqual(['lic', 'nid']);
    await userEvent.click(cta('مشاهده‌ی وضعیت ثبت‌نام'));
    expect(
      await screen.findByRole('heading', { level: 2, name: 'درخواست شما در حال بررسی است' }),
    ).toBeInTheDocument();
    expect(usePanelSession.getState().status).toBe('pending');
  });

  it('a server validation error stays on the step', async () => {
    server.use(
      http.post('*/v1/r/registration', () =>
        HttpResponse.json({ code: 'SHEBA_OWNER', message: 'شبا به نام مدیر نیست' }, { status: 400 }),
      ),
    );
    const field = await toSheba();
    await userEvent.type(field, VALID_SHEBA);
    await userEvent.click(cta('ارسال برای بررسی'));
    expect(await within(top()).findByRole('alert')).toHaveTextContent('شبا به نام مدیر نیست');
    expect(within(top()).getByLabelText('شماره‌ی شبا (برای تسویه‌حساب)')).toBeInTheDocument();
  });
});

describe('back', () => {
  it('steps back keeping what was typed; at the first step returns to login', async () => {
    await openWizard();
    await fillInfo();
    await userEvent.click(cta('ادامه'));
    await within(top()).findByRole('button', { name: /مجوز کسب/ });
    let res = '';
    act(() => {
      res = usePanelNav.getState().handleSystemBack();
    });
    expect(res).toBe('intercepted');
    expect(within(top()).getByLabelText('نام رستوران')).toHaveValue('کبابی تازه');
    await userEvent.click(within(top()).getByRole('button', { name: 'بازگشت' }));
    await waitFor(() => expect(screens()).toEqual(['login']));
    expect(usePanelSession.getState().accessToken).toBeNull();
  });
});

describe('needs more documents', () => {
  it('uploads only the asked documents, attaches them and returns to a fresh status', async () => {
    const attached: unknown[] = [];
    server.use(
      http.post('*/v1/r/docs', async ({ request }) => {
        attached.push(await request.json());
        return new HttpResponse(null, { status: 201 });
      }),
    );
    signedIn('needs_docs', '09130000002', false);
    render(<PanelShell />);
    await userEvent.click(await screen.findByRole('button', { name: 'بارگذاری مدارک' }));
    expect(await within(top()).findByRole('button', { name: /مجوز کسب/ })).toBeInTheDocument();
    expect(within(top()).queryByRole('button', { name: /کارت ملی/ })).toBeNull();
    expect(cta('ارسال برای بررسی')).toBeDisabled();
    await upload(/مجوز کسب/, file('license.pdf', 'application/pdf'));
    await waitFor(() => expect(cta('ارسال برای بررسی')).toBeEnabled());
    expect(attached).toEqual([{ docTypeId: 'lic', uploadId: expect.stringMatching(/^up/) }]);
    await userEvent.click(cta('ارسال برای بررسی'));
    await waitFor(() => expect(screens()).toEqual(['reg-status']));
  });
});
