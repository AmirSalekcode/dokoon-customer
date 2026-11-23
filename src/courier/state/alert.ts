import { create } from 'zustand';

/**
 * Which offer the full-screen alert shows (KAN-95). Opened by tapping a card or by a live `offer.created`;
 * the alert overlay itself reads this store.
 */
interface AlertState {
  offerId: string | null;
  open: (id: string) => void;
  close: () => void;
}

export const useOfferAlert = create<AlertState>((set) => ({
  offerId: null,
  open: (offerId) => set({ offerId }),
  close: () => set({ offerId: null }),
}));

export const openOffer = (id: string) => {
  if (id) useOfferAlert.getState().open(id);
};
