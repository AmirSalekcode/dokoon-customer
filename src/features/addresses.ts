import { create } from 'zustand';
import { api } from '@/api/client';
import type { Address, AddressInput } from '@/api/types';
import { readJson, writeJson } from '@/lib/storage';

const KEY = 'dk-address';

interface AddressesState {
  list: Address[];
  loaded: boolean;
  /** Last chosen delivery address (persisted). */
  selectedId: string | null;
  load: () => Promise<void>;
  select: (id: string) => void;
  /** POST /addresses. Returns the new address, or an error message (422 = outside the zone). */
  add: (input: AddressInput) => Promise<{ ok: true; address: Address } | { ok: false; message: string }>;
  remove: (id: string) => Promise<boolean>;
  clear: () => void;
}

export const useAddresses = create<AddressesState>((set, get) => ({
  list: [],
  loaded: false,
  selectedId: readJson<string | null>(KEY, null),
  load: async () => {
    try {
      const { data } = await api.GET('/addresses');
      if (!data) return;
      const sel = get().selectedId;
      const selectedId = data.some((a) => a.id === sel) ? sel : (data[0]?.id ?? null);
      writeJson(KEY, selectedId);
      set({ list: data, loaded: true, selectedId });
    } catch {
      set({ loaded: true });
    }
  },
  select: (id) => {
    writeJson(KEY, id);
    set({ selectedId: id });
  },
  add: async (input) => {
    try {
      const { data, error } = await api.POST('/addresses', { body: input });
      if (error !== undefined || !data) {
        const message = (error as { message?: string } | undefined)?.message;
        return { ok: false, message: message || 'ذخیره‌ی آدرس انجام نشد. دوباره تلاش کنید.' };
      }
      writeJson(KEY, data.id ?? null);
      set({ list: [...get().list, data], selectedId: data.id ?? null, loaded: true });
      return { ok: true, address: data };
    } catch {
      return { ok: false, message: 'اتصال برقرار نشد. دوباره تلاش کنید.' };
    }
  },
  remove: async (id) => {
    try {
      const { error } = await api.DELETE('/addresses/{id}', { params: { path: { id } } });
      if (error !== undefined) return false;
      const list = get().list.filter((a) => a.id !== id);
      const selectedId = get().selectedId === id ? (list[0]?.id ?? null) : get().selectedId;
      writeJson(KEY, selectedId);
      set({ list, selectedId });
      return true;
    } catch {
      return false;
    }
  },
  clear: () => {
    writeJson(KEY, null);
    set({ list: [], loaded: false, selectedId: null });
  },
}));

export const selectedAddress = (st: Pick<AddressesState, 'list' | 'selectedId'>) =>
  st.list.find((a) => a.id === st.selectedId) ?? null;
