import { businessError } from '@/api/businessError';

export { businessError, type BusinessError } from '@/api/businessError';

/**
 * Machine codes the courier app reacts to (proposed, contract-notes 37). Statuses are the contract's;
 * the codes tell two 409s apart.
 */
export const COURIER_ERROR = {
  /** `POST /c/offers/{id}/accept` 409: another courier took it first. */
  offerTaken: 'OFFER_TAKEN',
  /** `POST /c/offers/{id}/accept` 409: the 30 s window closed. */
  offerExpired: 'OFFER_EXPIRED',
  /** `PUT /c/status {online:false}` 409: cannot go offline with an active order. */
  activeOrder: 'ACTIVE_ORDER',
  /** `POST /c/orders/{id}/withdraw` 409: already picked up. */
  withdrawClosed: 'WITHDRAW_CLOSED',
  /** `POST /c/auth/verify` 401. */
  otpInvalid: 'OTP_INVALID',
  /** `POST /c/auth/otp` 429. */
  rateLimited: 'RATE_LIMITED',
} as const;

const codeOf = (error: unknown) => businessError(error)?.code;

/** The offer is no longer available (taken by another courier or expired): close the alert, toast. */
export const isOfferGone = (error: unknown) => {
  const c = codeOf(error);
  return c === COURIER_ERROR.offerTaken || c === COURIER_ERROR.offerExpired;
};

/** Going offline was refused because an order is in progress (courier rule 3). */
export const hasActiveOrder = (error: unknown) => codeOf(error) === COURIER_ERROR.activeOrder;
