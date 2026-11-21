import { idempotencyMiddleware as shared } from '@/api/idempotency';

/** Order state changes that must be safe to retry (Idempotency-Key, contract-notes 23). */
const IDEMPOTENT = /^\/r\/orders\/\{id\}\/(accept|reject|ready|handover|extend)$/;

/** `Idempotency-Key` on restaurant order actions (see src/api/idempotency.ts). */
export const idempotencyMiddleware = () => shared(IDEMPOTENT);
