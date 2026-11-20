import { create } from 'zustand';

interface ShiftState {
  /**
   * The «شروع شیفت» tap happened in this page load. Browsers only allow sound after a user gesture,
   * so a reload always starts at the shift screen again (memory only, never persisted).
   */
  started: boolean;
  start: () => void;
  end: () => void;
}

export const useShift = create<ShiftState>((set) => ({
  started: false,
  start: () => set({ started: true }),
  end: () => set({ started: false }),
}));
