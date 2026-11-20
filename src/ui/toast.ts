import { create } from 'zustand';

export interface ToastItem {
  id: number;
  text: string;
  tone: 'info' | 'success' | 'error' | 'warn';
}

interface ToastState {
  toasts: ToastItem[];
  show: (text: string, tone?: ToastItem['tone'], ms?: number) => void;
  dismiss: (id: number) => void;
}

let seq = 0;

export const useToast = create<ToastState>((set, get) => ({
  toasts: [],
  show: (text, tone = 'info', ms = 2500) => {
    const id = ++seq;
    // One toast at a time keeps the screen calm; newest wins.
    set({ toasts: [{ id, text, tone }] });
    setTimeout(() => get().dismiss(id), ms);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

/** Show a toast. `ms`: visible time (customer default 2.5 s; the restaurant app uses 2.6 s). */
export const toast = (text: string, tone?: ToastItem['tone'], ms?: number) =>
  useToast.getState().show(text, tone, ms);
