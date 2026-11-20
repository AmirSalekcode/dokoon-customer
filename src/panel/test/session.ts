import { usePanelSession } from '../api/session';
import type { RestaurantStatus } from '../api/types';
import { createMockStream } from '../mocks/stream';
import { setSocketFactory, stopLive } from '../realtime/live';
import { useShift } from '../state/shift';

/** Panel tests never open a real WebSocket: the live connection uses this in-page mock stream. */
export const testStream = createMockStream();
setSocketFactory(testStream.connect);

/** Tests: a signed-in manager (mock token carries the phone) whose shift has started. */
export function signedIn(status: RestaurantStatus = 'active', phone = '09131234567', shift = true) {
  stopLive();
  usePanelSession.getState().setSession({
    accessToken: `r-access-0-${phone}`,
    refreshToken: `r-refresh-0-${phone}`,
    status,
  });
  if (shift) useShift.getState().start();
  else useShift.getState().end();
}

export function signedOut() {
  stopLive();
  usePanelSession.getState().clear();
  useShift.getState().end();
}
