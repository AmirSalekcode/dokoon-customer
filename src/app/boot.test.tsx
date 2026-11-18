import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNav } from '@/nav/nav';
import { boot } from './boot';
import { AppErrorBoundary } from './AppErrorBoundary';

const top = () => useNav.getState().stack.at(-1);

describe('boot never leaves a blank page', () => {
  beforeEach(() => useNav.getState().resetTo('home'));

  it('renders the app after the mock worker starts', async () => {
    const renderApp = vi.fn();
    await boot({ useMocks: true, startMocks: () => Promise.resolve(), registerPwa: vi.fn(), renderApp });
    expect(renderApp).toHaveBeenCalledOnce();
    expect(top()?.screen).toBe('home');
  });

  it('still renders and shows the 503 page when the mock worker fails to register', async () => {
    const renderApp = vi.fn();
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    await boot({
      useMocks: true,
      startMocks: () => Promise.reject(new Error('[MSW] Failed to register the Service Worker')),
      registerPwa: vi.fn(),
      renderApp,
    });
    expect(renderApp).toHaveBeenCalledOnce();
    expect(top()).toMatchObject({ screen: 'error', params: { kind: 'e503' } });
    error.mockRestore();
  });

  it('production: registers the PWA service worker and never starts mocks', async () => {
    const startMocks = vi.fn();
    const registerPwa = vi.fn();
    await boot({ useMocks: false, startMocks, registerPwa, renderApp: vi.fn() });
    expect(startMocks).not.toHaveBeenCalled();
    expect(registerPwa).toHaveBeenCalledOnce();
  });

  it('a failing PWA registration does not block the app', async () => {
    const renderApp = vi.fn();
    await boot({
      useMocks: false,
      startMocks: vi.fn(),
      registerPwa: () => {
        throw new Error('sw blocked');
      },
      renderApp,
    });
    expect(renderApp).toHaveBeenCalledOnce();
  });
});

describe('<AppErrorBoundary />', () => {
  let error: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    error = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => error.mockRestore());

  function Boom(): never {
    throw new Error('render crash');
  }

  it('a render crash shows the 500 error page instead of a blank screen', () => {
    render(
      <AppErrorBoundary>
        <Boom />
      </AppErrorBoundary>,
    );
    expect(screen.getByRole('heading', { name: 'مشکلی در سرور پیش آمده' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'تلاش دوباره' })).toBeInTheDocument();
  });

  it('renders children normally when nothing throws', () => {
    render(
      <AppErrorBoundary>
        <p>سالم</p>
      </AppErrorBoundary>,
    );
    expect(screen.getByText('سالم')).toBeInTheDocument();
  });
});
