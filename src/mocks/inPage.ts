import { installMockFetch } from '@/lib/mockFetch';
import { handlers } from './handlers';

/** Customer mock API in the page itself (no service worker; see src/lib/mockFetch.ts). */
export function installInPageMocks(): () => void {
  return installMockFetch(handlers);
}
