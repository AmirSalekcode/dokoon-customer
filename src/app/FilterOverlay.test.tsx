import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useDiscovery } from '@/features/discovery/filters';
import { useNav } from '@/nav/nav';
import { FilterOverlay } from './FilterOverlay';

beforeEach(() => {
  useDiscovery.getState().reset();
  useDiscovery.getState().openDraft();
  useNav.getState().resetTo('home');
  useNav.getState().openOverlay({ kind: 'filter' });
});

describe('<FilterOverlay /> — shared FilterSheet (screen-specs §2)', () => {
  it('shows sort, toggles, food types and rating; the apply button counts live results', async () => {
    render(<FilterOverlay />);
    expect(screen.getByRole('dialog', { name: 'فیلتر و مرتب‌سازی' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'بیشترین امتیاز' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /باز است/ })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /تخفیف‌دار/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'کباب' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '۴٫۵+' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'نمایش ۳ رستوران' })).toBeInTheDocument();
  });

  it('editing updates the count, «اعمال» applies and closes', async () => {
    render(<FilterOverlay />);
    await userEvent.click(screen.getByRole('switch', { name: /باز است/ }));
    const apply = await screen.findByRole('button', { name: 'نمایش ۲ رستوران' });
    expect(useDiscovery.getState().applied.openNow).toBe(false);
    await userEvent.click(apply);
    expect(useDiscovery.getState().applied.openNow).toBe(true);
    expect(useNav.getState().overlay).toBeNull();
  });

  it('closing without applying keeps the previous filters', async () => {
    render(<FilterOverlay />);
    await userEvent.click(screen.getByRole('switch', { name: /تخفیف‌دار/ }));
    await userEvent.click(screen.getByTestId('scrim'));
    expect(useDiscovery.getState().applied.hasDiscount).toBe(false);
    expect(useNav.getState().overlay).toBeNull();
  });

  it('«حذف همه» resets the draft', async () => {
    render(<FilterOverlay />);
    await userEvent.click(screen.getByRole('button', { name: 'بیشترین امتیاز' }));
    await userEvent.click(screen.getByRole('button', { name: 'کباب' }));
    await userEvent.click(screen.getByRole('button', { name: 'حذف همه' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'کباب' })).toHaveAttribute('aria-pressed', 'false'),
    );
    expect(useDiscovery.getState().draft.sort).toBe('recommended');
  });

  it('no result → apply button says so and stays usable', async () => {
    render(<FilterOverlay />);
    await userEvent.click(screen.getByRole('button', { name: '۴٫۵+' }));
    await userEvent.click(screen.getByRole('button', { name: 'کیک' }));
    expect(await screen.findByRole('button', { name: 'رستورانی با این فیلترها نیست' })).toBeEnabled();
  });
});
