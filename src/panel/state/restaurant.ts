import { create } from 'zustand';
import { panelApi, type PanelApi } from '../api/client';
import type { RestaurantProfile } from '../api/types';
import { showFullPageError as fullPage } from '../errors/fullPage';

interface RestaurantState {
  profile: RestaurantProfile | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  /** PUT /r/open in flight: the switch is disabled (no double taps). */
  switching: boolean;
  load: (api?: PanelApi) => Promise<void>;
  /** Saves the manual open/closed switch. Resolves true when the server accepted it. */
  setOpen: (api: PanelApi | undefined, open: boolean) => Promise<boolean>;
}

/** Restaurant shown in the header (name, rating, open/closed) — GET /r/me, PUT /r/open. */
export const useRestaurant = create<RestaurantState>((set, get) => ({
  profile: null,
  status: 'idle',
  switching: false,

  load: async (api = panelApi()) => {
    set({ status: 'loading' });
    try {
      const { data, error } = await api.GET('/r/me');
      if (error !== undefined || !data) throw error ?? new Error('empty profile');
      set({ profile: data, status: 'ready' });
    } catch (e) {
      set({ status: 'error' });
      fullPage(e, () => void get().load(api));
    }
  },

  setOpen: async (api = panelApi(), open) => {
    if (get().switching) return false;
    set({ switching: true });
    try {
      const { data, error } = await api.PUT('/r/open', { body: { open } });
      if (error !== undefined) return false;
      const profile = get().profile;
      set({ profile: profile ? { ...profile, open: data?.open ?? open } : profile });
      return true;
    } catch (e) {
      fullPage(e, () => void get().setOpen(api, open));
      return false;
    } finally {
      set({ switching: false });
    }
  },
}));
