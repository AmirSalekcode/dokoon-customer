import { beforeEach, describe, expect, it } from 'vitest';
import { activeCount, DEFAULT_FILTERS, toQuery, useDiscovery } from './filters';

describe('discovery filters (shared by Home and Restaurants, FilterSheet)', () => {
  beforeEach(() => useDiscovery.getState().reset());

  it('defaults: all categories, recommended sort, nothing active', () => {
    const s = useDiscovery.getState();
    expect(s.category).toBe('all');
    expect(s.applied).toEqual(DEFAULT_FILTERS);
    expect(activeCount(s.applied)).toBe(0);
  });

  it('counts every active filter (sort changes count too)', () => {
    expect(activeCount({ ...DEFAULT_FILTERS, openNow: true, hasDiscount: true })).toBe(2);
    expect(activeCount({ ...DEFAULT_FILTERS, tags: ['kebab', 'pizza'], minRating: 4 })).toBe(3);
    expect(activeCount({ ...DEFAULT_FILTERS, sort: 'rating' })).toBe(1);
  });

  it('the sheet edits a draft; only «اعمال» changes what the lists use', () => {
    const st = useDiscovery.getState();
    st.openDraft();
    st.editDraft({ openNow: true });
    expect(useDiscovery.getState().applied.openNow).toBe(false);
    useDiscovery.getState().applyDraft();
    expect(useDiscovery.getState().applied.openNow).toBe(true);
  });

  it('«حذف همه» clears the draft only', () => {
    useDiscovery.getState().openDraft();
    useDiscovery.getState().editDraft({ hasDiscount: true, sort: 'eta' });
    useDiscovery.getState().clearDraft();
    expect(useDiscovery.getState().draft).toEqual(DEFAULT_FILTERS);
  });

  it('toggling a tag adds/removes it', () => {
    useDiscovery.getState().openDraft();
    useDiscovery.getState().toggleTag('kebab');
    useDiscovery.getState().toggleTag('pizza');
    useDiscovery.getState().toggleTag('kebab');
    expect(useDiscovery.getState().draft.tags).toEqual(['pizza']);
  });

  it('maps to the contract query of GET /restaurants (only set values)', () => {
    expect(toQuery('all', DEFAULT_FILTERS)).toEqual({ sort: 'recommended' });
    expect(
      toQuery('fast', { sort: 'rating', openNow: true, hasDiscount: false, tags: ['pizza'], minRating: 4 }),
    ).toEqual({ category: 'fast', sort: 'rating', openNow: true, tags: ['pizza'], minRating: 4 });
  });

  it('home shows curated sections only when nothing narrows the list', () => {
    const st = useDiscovery.getState();
    expect(st.isBrowsing()).toBe(true);
    st.setCategory('fast');
    expect(useDiscovery.getState().isBrowsing()).toBe(false);
    st.setCategory('all');
    st.openDraft();
    st.editDraft({ openNow: true });
    st.applyDraft();
    expect(useDiscovery.getState().isBrowsing()).toBe(false);
  });
});
