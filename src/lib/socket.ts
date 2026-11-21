/** The part of the browser WebSocket the live clients use; mock builds pass a fake (D-71: no SW). */
export interface SocketLike {
  readonly readyState: number;
  addEventListener(type: 'open' | 'message' | 'close' | 'error', listener: (e: Event) => void): void;
  removeEventListener(type: 'open' | 'message' | 'close' | 'error', listener: (e: Event) => void): void;
  send(data: string): void;
  close(code?: number, reason?: string): void;
}

export type SocketFactory = (url: string) => SocketLike;
