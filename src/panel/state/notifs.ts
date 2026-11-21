import { create } from 'zustand';
import { panelApi, type PanelApi } from '../api/client';
import type { Notification } from '../api/types';
import { showFullPageError } from '../errors/fullPage';

interface NotifsState {
  list: Notification[] | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  load: (api?: PanelApi) => Promise<void>;
  /** `POST /r/notifications/read`; no ids = all. Optimistic; a failure re-reads the list. */
  markRead: (ids?: string[], api?: PanelApi) => Promise<void>;
  /** Live `notification.created`: newest first. */
  add: (n: Notification) => void;
  reset: () => void;
}

const newestFirst = (a: Notification, b: Notification) =>
  Date.parse(b.createdAt ?? '') - Date.parse(a.createdAt ?? '');

/** Dokoon's messages to the restaurant (answers to support messages arrive here too). */
export const useNotifs = create<NotifsState>((set, get) => ({
  list: null,
  status: 'idle',

  load: async (api = panelApi()) => {
    set({ status: 'loading' });
    try {
      const { data, error } = await api.GET('/r/notifications');
      if (error !== undefined || !data) throw error ?? new Error('empty notifications');
      set({ list: [...data].sort(newestFirst), status: 'ready' });
    } catch (e) {
      set({ status: 'error' });
      showFullPageError(e, () => void get().load(api));
    }
  },

  markRead: async (ids, api = panelApi()) => {
    const before = get().list;
    if (!before) return;
    set({ list: before.map((n) => (!ids || ids.includes(n.id ?? '') ? { ...n, unread: false } : n)) });
    try {
      const { error } = await api.POST('/r/notifications/read', { body: ids ? { ids } : {} });
      if (error !== undefined) await get().load(api);
    } catch {
      await get().load(api);
    }
  },

  add: (n) => {
    const list = get().list;
    if (list && !list.some((x) => x.id === n.id)) set({ list: [n, ...list] });
  },
  reset: () => set({ list: null, status: 'idle' }),
}));

export const unreadCount = (list: Notification[] | null) => list?.filter((n) => n.unread).length ?? 0;
