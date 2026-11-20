import { toast } from '@/ui/toast';
import { usePanelNav } from '../nav/nav';
import { useRestaurant } from '../state/restaurant';

/** Restaurant app toasts last 2.6 s (restaurant component library: Toast). */
export const PANEL_TOAST_MS = 2600;
const FAILED = 'تغییر وضعیت رستوران ذخیره نشد؛ دوباره تلاش کنید';

/** Open immediately (no confirmation needed to start receiving orders). */
export async function reopen() {
  const ok = await useRestaurant.getState().setOpen(undefined, true);
  toast(ok ? 'رستوران باز شد' : FAILED, ok ? 'info' : 'error', PANEL_TOAST_MS);
}

/** Close only after the confirm dialog (screen specs: «بستن → ConfirmDialog»). */
export async function confirmClose() {
  usePanelNav.getState().closeOverlay();
  const ok = await useRestaurant.getState().setOpen(undefined, false);
  toast(ok ? 'رستوران بسته شد' : FAILED, ok ? 'warn' : 'error', PANEL_TOAST_MS);
}

/** Header switch. */
export function toggleOpen() {
  const open = useRestaurant.getState().profile?.open ?? true;
  if (open) usePanelNav.getState().openOverlay({ kind: 'confirm', props: { action: 'close' } });
  else void reopen();
}
