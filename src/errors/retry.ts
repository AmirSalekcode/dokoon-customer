/** The request to repeat when the user taps «تلاش دوباره» on an ErrorPage. */
let pending: (() => void) | null = null;

export function setRetry(fn: (() => void) | null) {
  pending = fn;
}

export function runRetry() {
  const fn = pending;
  pending = null;
  fn?.();
}
