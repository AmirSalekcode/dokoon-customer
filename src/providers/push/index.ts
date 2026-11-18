import { createFakePushProvider } from './fakePush';
import type { PushProvider } from './PushProvider';

/**
 * The app's push provider. Fake until the real channel is decided (FCM may be blocked in Iran —
 * decision D-50 is open). Swap the implementation here; callers only use the PushProvider interface.
 */
export const pushProvider: PushProvider = createFakePushProvider();
