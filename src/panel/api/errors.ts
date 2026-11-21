import { businessError } from '@/api/businessError';

export { businessError, type BusinessError } from '@/api/businessError';

/** Another device answered this order first (D-96): close the alert and toast, no error page. */
export const isAlreadyAnswered = (error: unknown) => businessError(error)?.code === 'ALREADY_ANSWERED';
