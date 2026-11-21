// Tiny stand-in backend for the k6 backend scenarios' CI smoke run (KAN-74, D-104). NOT the real API:
// it only answers the endpoints perf/backend/restaurant.js uses, with contract-shaped JSON, plus a minimal
// RFC 6455 WebSocket at /v1/r/stream that pushes `order.created` frames. Real capacity numbers come only
// from running the same script against the backend's staging (BASE_URL / WS_URL).
//
//   node perf/backend/mock-server.mjs            (PORT defaults to 4020)
import { createHash, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';

const PORT = Number(process.env.PORT || 4020);
const PREFIX = '/v1';
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

const json = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};
const order = (id, status = 'new') => ({
  id,
  no: String(1000 + (Number.parseInt(id.slice(-4), 16) % 9000)),
  status,
  placedAt: new Date().toISOString(),
  items: [{ name: 'چلوکباب کوبیده', qty: 1, price: 285000 }],
  total: 285000,
  payment: 'online',
});
const answered = new Set();

const routes = [
  [
    'POST',
    /^\/r\/stream\/ticket$/,
    (req, res) => json(res, 200, { ticket: `t-${randomUUID()}`, expiresInSec: 30 }),
  ],
  ['GET', /^\/r\/me$/, (req, res) => json(res, 200, { id: 'r1', name: 'رستوران نمونه', open: true })],
  [
    'GET',
    /^\/r\/orders$/,
    (req, res) =>
      json(res, 200, {
        items: Array.from({ length: 10 }, (_, i) => order(`o-${i.toString(16).padStart(4, '0')}`)),
        nextCursor: null,
      }),
  ],
  [
    'GET',
    /^\/r\/reports$/,
    (req, res) =>
      json(res, 200, {
        revenue: 4850000,
        orders: 17,
        avgOrder: 285000,
        avgPrepMinutes: 18,
        chart: [],
        topFoods: [],
      }),
  ],
  [
    'POST',
    /^\/orders$/,
    (req, res) => json(res, 201, { order: order(`o-${randomUUID().slice(0, 4)}`), payment: null }),
  ],
  [
    'POST',
    /^\/r\/orders\/([\w-]+)\/accept$/,
    (req, res, m) => {
      // Same Idempotency-Key → same answer; a different device answering again → 409 (D-96).
      const key = `${m[1]}:${req.headers['idempotency-key'] ?? ''}`;
      if (answered.has(m[1]) && !answered.has(key))
        return json(res, 409, { code: 'ALREADY_ANSWERED', message: 'x' });
      answered.add(m[1]);
      answered.add(key);
      if (answered.size > 50_000) answered.clear();
      return json(res, 200, order(m[1], 'prep'));
    },
  ],
];

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://x');
  if (url.pathname === '/healthz') return json(res, 200, { ok: true });
  if (!url.pathname.startsWith(PREFIX)) return json(res, 404, { code: 'NOT_FOUND' });
  const path = url.pathname.slice(PREFIX.length);
  if (path !== '/orders' && path.startsWith('/r/') && !req.headers.authorization?.startsWith('Bearer '))
    return json(res, 401, { code: 'UNAUTHORIZED' });
  for (const [method, re, fn] of routes) {
    const m = path.match(re);
    if (m && req.method === method) {
      req.resume();
      return req.on('end', () => fn(req, res, m));
    }
  }
  json(res, 404, { code: 'NOT_FOUND' });
});

/** One unmasked server→client text frame. */
function frame(text) {
  const data = Buffer.from(text);
  const len = data.length;
  const head = len < 126 ? Buffer.from([0x81, len]) : Buffer.from([0x81, 126, len >> 8, len & 0xff]);
  return Buffer.concat([head, data]);
}

server.on('upgrade', (req, socket) => {
  const url = new URL(req.url ?? '/', 'http://x');
  const key = req.headers['sec-websocket-key'];
  if (url.pathname !== `${PREFIX}/r/stream` || !key || !url.searchParams.get('ticket')?.startsWith('t-')) {
    socket.end('HTTP/1.1 401 Unauthorized\r\n\r\n');
    return;
  }
  const accept = createHash('sha1')
    .update(key + WS_GUID)
    .digest('base64');
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${accept}\r\n\r\n`,
  );
  const timer = setInterval(() => {
    socket.write(
      frame(JSON.stringify({ event: 'order.created', data: order(`o-${randomUUID().slice(0, 4)}`) })),
    );
  }, 1000);
  socket.on('data', (buf) => {
    // Opcode 0x8 = close from the client: answer and end.
    if ((buf[0] & 0x0f) === 0x8) {
      socket.end(Buffer.from([0x88, 0]));
    }
  });
  const stop = () => clearInterval(timer);
  socket.on('close', stop);
  socket.on('error', stop);
});

server.listen({ port: PORT, host: '127.0.0.1', backlog: 4096 }, () =>
  console.log(`perf mock backend on http://127.0.0.1:${PORT}${PREFIX}`),
);
