import { pushProvider } from '@/providers/push';
import type { PushProvider } from '@/providers/push/PushProvider';
import { panelApi, type PanelApi } from '../api/client';

export type PanelPushResult = 'on' | 'denied' | 'unsupported' | 'error';

/**
 * Background alerts for the panel behind the shared PushProvider (D-98, CLAUDE.md rule 10): ask on a
 * user tap, then register the token with `POST /r/push/subscribe`. The panel works fully without it
 * (WebSocket + sound while open); the real channel is still open (D-50).
 */
export async function enablePanelPush(
  provider: PushProvider = pushProvider,
  api: PanelApi = panelApi(),
): Promise<PanelPushResult> {
  try {
    if (!(await provider.isSupported())) return 'unsupported';
    let perm = await provider.permission();
    if (perm === 'default') perm = await provider.requestPermission();
    if (perm !== 'granted') return 'denied';
    const token = await provider.getToken();
    if (!token) return 'error';
    const { error } = await api.POST('/r/push/subscribe', {
      body: { provider: `${provider.id}:${token.channel}`, token: token.token },
    });
    return error === undefined ? 'on' : 'error';
  } catch {
    return 'error';
  }
}

export async function panelPushState(
  provider: PushProvider = pushProvider,
): Promise<PanelPushResult | 'off'> {
  try {
    if (!(await provider.isSupported())) return 'unsupported';
    const perm = await provider.permission();
    return perm === 'denied' ? 'denied' : perm === 'granted' ? 'on' : 'off';
  } catch {
    return 'unsupported';
  }
}
