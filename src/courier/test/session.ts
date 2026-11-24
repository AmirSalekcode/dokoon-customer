import { vi } from 'vitest';
import { useCourierSession } from '../api/session';
import { SESSION_COOKIE } from '../mocks/handlers';

/** Approved demo courier of the mock (any phone outside DEMO_STATUS_PHONES). */
export const APPROVED_PHONE = '09131234567';

/**
 * Signed in on the web: every request carries the mock's HttpOnly session cookie (jsdom's fetch keeps no
 * cookie jar, so it is added here). Undo with `vi.restoreAllMocks()`.
 */
export function signedInCourier(phone = APPROVED_PHONE, name = 'رضا احمدی') {
  const realFetch = globalThis.fetch.bind(globalThis);
  vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const req = new Request(input, init);
    req.headers.set('Cookie', `${SESSION_COOKIE}=c-1-${phone}`);
    return realFetch(req);
  });
  useCourierSession.getState().setSession({ status: 'approved', name });
}
