import { mountWithFallback, MapUnavailableError } from './map/MapProvider';
import { createFakeMapProvider } from './map/fakeMap';
import { createFakePaymentProvider } from './payment/fakePayment';
import { parsePaymentReturn } from './payment/PaymentProvider';
import { createFakePushProvider } from './push/fakePush';

const center = { lat: 32.0089, lng: 51.8668 };

describe('MapProvider fallback', () => {
  it('uses the user-preferred provider when it works', async () => {
    const el = document.createElement('div');
    const r = await mountWithFallback(
      [createFakeMapProvider('neshan'), createFakeMapProvider('balad')],
      'balad',
      el,
      {
        center,
        zoom: 15,
      },
    );
    expect(r.provider.id).toBe('balad');
    expect(r.handle.getCenter()).toEqual(center);
  });

  it('falls back to the other provider if the preferred one fails to mount', async () => {
    const el = document.createElement('div');
    const r = await mountWithFallback(
      [createFakeMapProvider('neshan', { failMount: true }), createFakeMapProvider('balad')],
      'neshan',
      el,
      { center, zoom: 15 },
    );
    expect(r.provider.id).toBe('balad');
  });

  it('throws MapUnavailableError when all providers fail', async () => {
    const el = document.createElement('div');
    await expect(
      mountWithFallback(
        [
          createFakeMapProvider('neshan', { available: false }),
          createFakeMapProvider('balad', { failMount: true }),
        ],
        'neshan',
        el,
        { center, zoom: 15 },
      ),
    ).rejects.toBeInstanceOf(MapUnavailableError);
  });

  it('reports center changes as coordinates', async () => {
    const seen: unknown[] = [];
    const el = document.createElement('div');
    const { handle } = await mountWithFallback([createFakeMapProvider('neshan')], 'neshan', el, {
      center,
      zoom: 15,
      onCenterChange: (c) => seen.push(c),
    });
    handle.setCenter({ lat: 1, lng: 2 });
    expect(seen).toEqual([{ lat: 1, lng: 2 }]);
  });
});

describe('PaymentProvider', () => {
  it('parses the return deep link', () => {
    expect(parsePaymentReturn('https://app.dokoon.example/pay?orderId=o1&result=ok')).toEqual({
      orderId: 'o1',
      result: 'ok',
    });
    expect(parsePaymentReturn('dokoon://pay?orderId=o1&result=fail')).toEqual({
      orderId: 'o1',
      result: 'fail',
    });
    expect(parsePaymentReturn('https://x/pay?orderId=o1&result=maybe')).toBeNull();
  });

  it('fake provider records open calls', async () => {
    const p = createFakePaymentProvider();
    await p.open({ provider: 'zibal', redirectUrl: 'about:blank' });
    expect(p.opened).toHaveLength(1);
  });
});

describe('PushProvider', () => {
  it('fake push: permission → token → messages', async () => {
    const p = createFakePushProvider();
    expect(await p.getToken()).toBeNull();
    expect(await p.requestPermission()).toBe('granted');
    expect((await p.getToken())?.token).toBe('fake-token');
    const got: string[] = [];
    const off = p.onMessage((m) => got.push(m.title));
    p.emit({ title: 'سفارش در راه است', body: '' });
    off();
    p.emit({ title: 'ignored', body: '' });
    expect(got).toEqual(['سفارش در راه است']);
  });
});
