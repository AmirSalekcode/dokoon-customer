import { describe, expect, it, vi } from 'vitest';
import { ApiError } from './errors';
import { createHttp } from './http';

// KAN-86: `inlineStatus` lets one request keep a status on the screen (courier OTP verify: 401 = wrong code).
const respond = (status: number) => vi.fn(async () => Response.json({ code: 'X', message: 'x' }, { status }));

describe('createHttp inlineStatus', () => {
  it('hands the response back for a matching request instead of raising the page', async () => {
    const onUnauthorized = vi.fn(async () => true);
    const http = createHttp({
      fetchImpl: respond(401),
      onUnauthorized,
      inlineStatus: (s, r) => s === 401 && r.url.endsWith('/verify'),
    });
    const res = await http('http://x.test/c/auth/verify', { method: 'POST' });
    expect(res.status).toBe(401);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('other requests keep the full-page mapping', async () => {
    const http = createHttp({
      fetchImpl: respond(401),
      inlineStatus: (s, r) => s === 401 && r.url.endsWith('/verify'),
    });
    const e = await http('http://x.test/c/me').catch((x: unknown) => x);
    expect(e).toBeInstanceOf(ApiError);
    expect((e as ApiError).kind).toBe('e401');
  });
});
