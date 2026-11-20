import { create } from 'zustand';
import type { LiveTab } from './orders';

export type OrdersTab = LiveTab | 'history';

/** Orders tab UI that must survive switching root tabs (the stack remounts the screen). */
interface OrdersUiState {
  tab: OrdersTab;
  /** Order shown in the tablet detail panel. */
  selectedId: string | null;
  setTab: (t: OrdersTab) => void;
  select: (id: string | null) => void;
  reset: () => void;
}

export const useOrdersUi = create<OrdersUiState>((set) => ({
  tab: 'new',
  selectedId: null,
  setTab: (tab) => set({ tab }),
  select: (selectedId) => set({ selectedId }),
  reset: () => set({ tab: 'new', selectedId: null }),
}));
