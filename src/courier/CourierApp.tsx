import { CourierShell } from './shell/CourierShell';

/** Courier app root (KAN-85 entry): the shell owns navigation, overlays, toasts and the offline page. */
export function CourierApp() {
  return <CourierShell />;
}
