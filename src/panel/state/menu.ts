import { create } from 'zustand';
import { toast } from '@/ui/toast';
import { panelApi, type PanelApi } from '../api/client';
import { businessError } from '../api/errors';
import type { Food, MenuCategory } from '../api/types';
import { showFullPageError } from '../errors/fullPage';

/** Restaurant toasts stay 2.6 s (component library). */
const TOAST_MS = 2600;

/** A category row on the `cats` screen: `id` missing = new (not saved yet). */
export interface CatDraft {
  key: string;
  id?: string;
  label: string;
}

interface MenuState {
  categories: MenuCategory[];
  foods: Food[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  /** Availability switch in flight per food id (second taps are ignored). */
  busy: Record<string, boolean>;
  load: (api?: PanelApi) => Promise<void>;
  /** Optimistic `PATCH /r/foods/{id} {available}`; rolls back + toast on any failure. */
  setAvailable: (id: string, available: boolean, api?: PanelApi) => Promise<boolean>;
  /** Saves renamed (`PATCH`) and new (`POST`) categories, then re-reads the menu. */
  saveCategories: (drafts: CatDraft[], api?: PanelApi) => Promise<boolean>;
  /** Only an empty category; otherwise a toast and no request (screen specs §3). */
  deleteCategory: (id: string, api?: PanelApi) => Promise<boolean>;
  /** Replace or add one food after the editor saved it (KAN-67). */
  upsertFood: (food: Food) => void;
  removeFood: (id: string) => void;
  reset: () => void;
}

const bySort = (a: MenuCategory, b: MenuCategory) => (a.sort ?? 0) - (b.sort ?? 0);

/** Foods of one category tab (`all` = every food), in server order. */
export const foodsIn = (foods: Food[], cat: string) =>
  cat === 'all' ? foods : foods.filter((f) => f.categoryId === cat);

/** Inline errors of the category drafts, keyed by draft key (empty object = can save). */
export function catDraftErrors(drafts: CatDraft[]): Record<string, string> {
  const out: Record<string, string> = {};
  const seen = new Set<string>();
  for (const d of drafts) {
    const v = d.label.trim();
    if (!v) out[d.key] = 'نام دسته را بنویسید';
    else if (seen.has(v)) out[d.key] = 'این نام تکراری است';
    seen.add(v);
  }
  return out;
}

const initial = () => ({ categories: [], foods: [], status: 'idle' as const, busy: {} });

/** Menu of the restaurant (`GET /r/menu`) shared by the menu tab, the category and dish editors. */
export const useMenu = create<MenuState>((set, get) => {
  const patchFood = (id: string, patch: Partial<Food>) =>
    set({ foods: get().foods.map((f) => (f.id === id ? { ...f, ...patch } : f)) });

  const fetchMenu = async (api: PanelApi) => {
    const { data, error } = await api.GET('/r/menu');
    if (error !== undefined || !data) throw error ?? new Error('empty menu');
    set({
      categories: [...(data.categories ?? [])].sort(bySort),
      foods: data.foods ?? [],
      status: 'ready',
    });
  };

  return {
    ...initial(),

    load: async (api = panelApi()) => {
      set({ status: 'loading' });
      try {
        await fetchMenu(api);
      } catch (e) {
        set({ status: 'error' });
        showFullPageError(e, () => void get().load(api));
      }
    },

    setAvailable: async (id, available, api = panelApi()) => {
      const food = get().foods.find((f) => f.id === id);
      if (!food || get().busy[id]) return false;
      const before = food.available !== false;
      set({ busy: { ...get().busy, [id]: true } });
      patchFood(id, { available });
      let fail: string | null = null;
      try {
        const { error } = await api.PATCH('/r/foods/{id}', { params: { path: { id } }, body: { available } });
        if (error !== undefined) fail = businessError(error)?.message ?? '';
      } catch {
        // A quick switch never takes the whole screen; offline is shown by the connectivity watcher.
        fail = 'تغییر موجودی ذخیره نشد؛ دوباره تلاش کنید';
      }
      const { [id]: _done, ...rest } = get().busy;
      set({ busy: rest });
      if (fail !== null) {
        patchFood(id, { available: before });
        toast(fail || 'تغییر موجودی ذخیره نشد؛ دوباره تلاش کنید', 'error', TOAST_MS);
        return false;
      }
      toast(`«${food.name ?? ''}» ${available ? 'موجود' : 'ناموجود'} شد`, 'info', TOAST_MS);
      return true;
    },

    saveCategories: async (drafts, api = panelApi()) => {
      if (Object.keys(catDraftErrors(drafts)).length) return false;
      const old = new Map(get().categories.map((c) => [c.id, c.label]));
      try {
        for (const d of drafts) {
          const label = d.label.trim();
          if (d.id && old.get(d.id) === label) continue;
          const { error } = d.id
            ? await api.PATCH('/r/categories/{id}', { params: { path: { id: d.id } }, body: { label } })
            : await api.POST('/r/categories', { body: { label } });
          if (error !== undefined) {
            toast(businessError(error)?.message ?? '', 'error', TOAST_MS);
            await fetchMenu(api);
            return false;
          }
        }
        await fetchMenu(api);
        return true;
      } catch (e) {
        if (!showFullPageError(e, () => void get().saveCategories(drafts, api)))
          toast('دسته‌ها ذخیره نشد؛ دوباره تلاش کنید', 'error', TOAST_MS);
        return false;
      }
    },

    deleteCategory: async (id, api = panelApi()) => {
      if (get().foods.some((f) => f.categoryId === id)) {
        toast('اول غذاهای این دسته را به دسته‌ی دیگری منتقل کنید', 'warn', TOAST_MS);
        return false;
      }
      try {
        const { error } = await api.DELETE('/r/categories/{id}', { params: { path: { id } } });
        if (error !== undefined) {
          toast(businessError(error)?.message ?? '', 'error', TOAST_MS);
          return false;
        }
        set({ categories: get().categories.filter((c) => c.id !== id) });
        toast('دسته حذف شد', 'info', TOAST_MS);
        return true;
      } catch (e) {
        if (!showFullPageError(e, () => void get().deleteCategory(id, api)))
          toast('دسته حذف نشد؛ دوباره تلاش کنید', 'error', TOAST_MS);
        return false;
      }
    },

    upsertFood: (food) => {
      const has = get().foods.some((f) => f.id === food.id);
      set({ foods: has ? get().foods.map((f) => (f.id === food.id ? food : f)) : [...get().foods, food] });
    },
    removeFood: (id) => set({ foods: get().foods.filter((f) => f.id !== id) }),
    reset: () => set(initial()),
  };
});

/** Picture of a food: the real photo only once Dokoon approved it, else the default art (screen specs §3). */
export const foodArt = (f: Food) =>
  f.photo?.status === 'approved' && f.photo.url ? f.photo.url : f.art || 'dk-all';
