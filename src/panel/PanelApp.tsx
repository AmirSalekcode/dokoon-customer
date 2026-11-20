import { AppErrorBoundary } from '@/errors/AppErrorBoundary';
import { PanelShell } from './shell/PanelShell';

/** Restaurant panel root: a render crash shows the 500 page, never a blank screen. */
export function PanelApp() {
  return (
    <AppErrorBoundary>
      <PanelShell />
    </AppErrorBoundary>
  );
}
