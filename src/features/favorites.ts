import { create } from 'zustand';
import { api } from '@/api/client';
import { isLoggedIn } from '@/auth/flow';
import { useNav } from '@/nav/nav';
import { toast } from '@/ui/toast';

/**
 * Restaurant favorites. The server value (`isFavorite`) is the base; local overrides make the heart
 * flip instantly (optimistic) and are rolled back if the request fails. Guests are asked to log in.
 */
interface FavState {
  overrides: Record<string, boolean>;
  set: (id: string, on: boolean) => void;
  clear: () => void;
}

export const useFavorites = create<FavState>((set, get) => ({
  overrides: {},
  set: (id, on) => set({ overrides: { ...get().overrides, [id]: on } }),
  clear: () => set({ overrides: {} }),
}));

export const isFavorite = (overrides: Record<string, boolean>, id: string, server?: boolean) =>
  id in overrides ? overrides[id] : !!server;

export async function toggleFavorite(id: string, current: boolean): Promise<void> {
  if (!isLoggedIn()) {
    toast('برای ذخیره‌ی علاقه‌مندی‌ها وارد شوید');
    useNav.getState().push('login');
    return;
  }
  const next = !current;
  useFavorites.getState().set(id, next);
  try {
    const params = { params: { path: { id } } };
    const res = next
      ? await api.PUT('/favorites/restaurants/{id}', params)
      : await api.DELETE('/favorites/restaurants/{id}', params);
    if (res.error) throw new Error('favorite failed');
  } catch {
    useFavorites.getState().set(id, current);
    toast('ذخیره نشد. دوباره تلاش کنید.', 'error');
  }
}
