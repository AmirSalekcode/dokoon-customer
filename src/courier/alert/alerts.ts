import { useCourierNav } from '../nav/nav';
import { onCourierEvent } from '../realtime/live';
import { registerOverlay } from '../shell/overlays';
import { useOnline } from '../state/online';
import { OfferAlertOverlay } from './OfferAlertOverlay';

/** Open the full-screen alert for an offer (card tap). */
export function openOffer(offerId: string) {
  if (offerId) useCourierNav.getState().openOverlay({ kind: 'alr', props: { offerId } });
}

/**
 * New offers open the alert by themselves (KAN-95) when the courier is online and free and nothing else is
 * open — a dialog or sheet the courier is using is never covered; the offer then waits in the list. Called
 * once by the shell; returns the cleanup.
 */
export function initOfferAlerts(): () => void {
  registerOverlay('alr', OfferAlertOverlay);
  const off = onCourierEvent((msg) => {
    if (msg.event !== 'offer.created' || !msg.data.id) return;
    const { online, hasActive } = useOnline.getState();
    if (!online || hasActive || useCourierNav.getState().overlay) return;
    openOffer(msg.data.id);
  });
  return () => {
    off();
    registerOverlay('alr', null);
  };
}
