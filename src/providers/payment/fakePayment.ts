import type { PaymentInit } from '@/api/types';
import { parsePaymentReturn, type PaymentProvider } from './PaymentProvider';

/**
 * Fake gateway: instead of redirecting, calls `onOpen` so the app can show the `gateway` simulator
 * screen (success / fail / timeout). Real Zibal / ZarinPal adapters replace this after sandbox access.
 */
export function createFakePaymentProvider(onOpen: (init: PaymentInit) => void = () => {}): PaymentProvider & {
  opened: PaymentInit[];
} {
  const opened: PaymentInit[] = [];
  return {
    id: 'fake',
    opened,
    open: async (init) => {
      opened.push(init);
      onOpen(init);
    },
    parseReturn: parsePaymentReturn,
  };
}
