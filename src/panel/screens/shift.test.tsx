import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '@/mocks/node';
import { useToast } from '@/ui/toast';
import { panelHandlers, resetPanelMockDb } from '../mocks/handlers';
import { usePanelNav } from '../nav/nav';
import { PanelShell } from '../shell/PanelShell';
import { setSoundEngine, type SoundEngine } from '../sound/engine';
import { DEFAULT_SOUND, SOUND_KEY, useSoundSettings } from '../sound/settings';
import { setWakeLock, type WakeLock } from '../sound/wakeLock';
import { SHIFT_NO_SOUND, SHIFT_NO_WAKE, SHIFT_STARTED, useShift } from '../state/shift';
import { useRestaurant } from '../state/restaurant';
import { signedIn } from '../test/session';

// KAN-61: «شروع شیفت» (sound unlock + wake lock) and the «صدا و هشدار» screen.
function fakeEngine(over: Partial<Record<keyof SoundEngine, unknown>> = {}) {
  const e = {
    unlock: vi.fn(async () => true),
    preview: vi.fn(async () => 3200),
    stopPreview: vi.fn(),
    startAlert: vi.fn(),
    stopAlert: vi.fn(),
    mute: vi.fn(),
    applyLevel: vi.fn(),
    unlocked: true,
    alerting: false,
    muted: false,
    ...over,
  };
  setSoundEngine(e as unknown as SoundEngine);
  return e;
}
function fakeWake(supported = true, held = true) {
  const w = { supported, acquire: vi.fn(async () => held), release: vi.fn(async () => {}), held };
  setWakeLock(w as unknown as WakeLock);
  return w;
}

beforeEach(() => {
  server.use(...panelHandlers);
  resetPanelMockDb();
  localStorage.clear();
  useToast.setState({ toasts: [] });
  useRestaurant.setState({ profile: null, status: 'idle', switching: false });
  useSoundSettings.setState({ ...DEFAULT_SOUND });
  usePanelNav.getState().resetTo('login');
});
afterEach(() => {
  setSoundEngine(null);
  setWakeLock(null);
});

const top = () => screen.getByRole('main', { hidden: false });

describe('shift screen', () => {
  it('three tips; the tap unlocks sound, keeps the screen on and opens orders', async () => {
    const engine = fakeEngine();
    const wake = fakeWake();
    signedIn('active', '09131234567', false);
    render(<PanelShell />);
    const tips = await screen.findByRole('list', { name: 'نکته‌های شیفت' });
    expect(within(tips).getAllByRole('listitem')).toHaveLength(3);
    await userEvent.click(screen.getByRole('button', { name: 'شروع شیفت و فعال‌سازی صدا' }));
    expect(engine.unlock).toHaveBeenCalledTimes(1);
    expect(wake.acquire).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('heading', { level: 1, name: 'کبابی سنتی زاگرس' })).toBeInTheDocument();
    expect(await screen.findByRole('status')).toHaveTextContent(SHIFT_STARTED);
    expect(useShift.getState()).toMatchObject({ started: true, soundOn: true, screenOn: true });
  });

  it('without Wake Lock the toast asks to turn off auto-lock', async () => {
    fakeEngine();
    fakeWake(false, false);
    signedIn('active', '09131234567', false);
    render(<PanelShell />);
    await userEvent.click(await screen.findByRole('button', { name: 'شروع شیفت و فعال‌سازی صدا' }));
    expect(await screen.findByRole('status')).toHaveTextContent(SHIFT_NO_WAKE);
  });

  it('a browser that refuses audio gets a warning', async () => {
    fakeEngine({ unlock: vi.fn(async () => false) });
    fakeWake();
    signedIn('active', '09131234567', false);
    render(<PanelShell />);
    await userEvent.click(await screen.findByRole('button', { name: 'شروع شیفت و فعال‌سازی صدا' }));
    expect(await screen.findByRole('status')).toHaveTextContent(SHIFT_NO_SOUND);
  });

  it('logout stops the alert and lets the screen sleep', async () => {
    const engine = fakeEngine();
    const wake = fakeWake();
    signedIn();
    render(<PanelShell />);
    await screen.findByRole('heading', { level: 1, name: 'کبابی سنتی زاگرس' });
    const { logout } = await import('../auth/flow');
    await act(() => logout());
    expect(engine.stopAlert).toHaveBeenCalled();
    expect(wake.release).toHaveBeenCalled();
    expect(useShift.getState().started).toBe(false);
  });
});

describe('sound screen', () => {
  async function openSound() {
    signedIn();
    render(<PanelShell />);
    const tabs = await screen.findByRole('navigation', { name: 'بخش‌های رستوران' });
    await userEvent.click(within(tabs).getByRole('button', { name: 'حساب' }));
    await userEvent.click(within(top()).getByRole('button', { name: /صدا و هشدار/ }));
    await within(top()).findByRole('heading', { name: 'صدا و هشدار' });
  }

  it('preview plays and stops; levels are radios saved per device', async () => {
    const engine = fakeEngine();
    fakeWake();
    await openSound();
    await userEvent.click(within(top()).getByRole('button', { name: 'پخش صدای سفارش جدید' }));
    expect(engine.preview).toHaveBeenCalled();
    const stop = await within(top()).findByRole('button', { name: 'توقف صدا' });
    await userEvent.click(stop);
    expect(engine.stopPreview).toHaveBeenCalled();
    const levels = within(top()).getByRole('radiogroup', { name: 'بلندی صدا' });
    expect(within(levels).getAllByRole('radio')).toHaveLength(5);
    await userEvent.click(within(levels).getByRole('radio', { name: 'سطح ۲' }));
    expect(within(levels).getByRole('radio', { name: 'سطح ۲' })).toHaveAttribute('aria-checked', 'true');
    expect(engine.applyLevel).toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem(SOUND_KEY)!)).toMatchObject({ level: 2 });
  });

  it('repeat toggle persists; the iOS note is always shown', async () => {
    fakeEngine();
    fakeWake();
    await openSound();
    const repeat = within(top()).getByRole('switch', { name: /تکرار صدا تا پاسخ/ });
    expect(repeat).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(repeat);
    await waitFor(() => expect(repeat).toHaveAttribute('aria-checked', 'false'));
    expect(JSON.parse(localStorage.getItem(SOUND_KEY)!)).toMatchObject({ repeat: false });
    expect(within(top()).getByText(/روی آیفون/)).toBeInTheDocument();
  });

  it('without Wake Lock the screen-lock note is shown', async () => {
    fakeEngine();
    fakeWake(false, false);
    await openSound();
    expect(within(top()).getByText(/نمی‌تواند صفحه را روشن نگه دارد/)).toBeInTheDocument();
  });
});
