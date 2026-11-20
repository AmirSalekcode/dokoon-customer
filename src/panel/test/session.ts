import { usePanelSession } from '../api/session';
import type { RestaurantStatus } from '../api/types';
import { useShift } from '../state/shift';

/** Tests: a signed-in manager (mock token carries the phone) whose shift has started. */
export function signedIn(status: RestaurantStatus = 'active', phone = '09131234567', shift = true) {
  usePanelSession.getState().setSession({
    accessToken: `r-access-0-${phone}`,
    refreshToken: `r-refresh-0-${phone}`,
    status,
  });
  if (shift) useShift.getState().start();
  else useShift.getState().end();
}

export function signedOut() {
  usePanelSession.getState().clear();
  useShift.getState().end();
}
