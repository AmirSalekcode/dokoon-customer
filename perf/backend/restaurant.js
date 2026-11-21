// k6 backend scenarios for the restaurant panel (KAN-74, D-104).
//
//   PROFILE=full  (default): the target load — 500 live WebSocket connections (restaurants on shift),
//                 2000 new orders per minute (customer POST /orders + restaurant accept) and panel REST
//                 traffic. Run ONLY against the backend's staging; that run gives the real capacity numbers.
//   PROFILE=smoke: a few VUs for a few seconds; CI runs it on perf/backend/mock-server.mjs so the script
//                 itself never rots. It proves nothing about capacity.
//
//   k6 run -e PROFILE=smoke -e BASE_URL=http://127.0.0.1:4020/v1 perf/backend/restaurant.js
//   k6 run -e BASE_URL=https://staging-api.../v1 -e TOKEN=<restaurant access token> -e CUSTOMER_TOKEN=<…> perf/backend/restaurant.js
//
// Env: BASE_URL (…/v1), WS_URL (default: BASE_URL with ws(s)://…/r/stream), TOKEN, CUSTOMER_TOKEN,
//      WS_HOLD (seconds each socket stays open, full default 60), DURATION (default smoke 6s / full 5m).
import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

const PROFILE = __ENV.PROFILE || 'full';
const SMOKE = PROFILE === 'smoke';
const BASE_URL = (__ENV.BASE_URL || 'http://127.0.0.1:4020/v1').replace(/\/$/, '');
const WS_URL = __ENV.WS_URL || `${BASE_URL.replace(/^http/, 'ws')}/r/stream`;
const TOKEN = __ENV.TOKEN || 'r-access-0-09131234567';
const CUSTOMER_TOKEN = __ENV.CUSTOMER_TOKEN || 'access-0-09131234567';
const DURATION = __ENV.DURATION || (SMOKE ? '6s' : '5m');
const WS_HOLD = Number(__ENV.WS_HOLD || (SMOKE ? 4 : 60));

/** Target load (D-104). */
export const TARGET = { sockets: 500, ordersPerMinute: 2000, restVus: 50 };

const wsConnected = new Rate('ws_connected');
const wsEvents = new Counter('ws_events');
const ordersAccepted = new Rate('orders_accepted');
/** placedAt → frame received on the device (ms); assumes roughly synced clocks (NTP) on staging. */
const wsEventDelay = new Trend('ws_event_delay', true);

export const options = {
  scenarios: {
    // Restaurants come on shift over time (not all in the same millisecond): ramp up, then hold.
    live: {
      executor: 'ramping-vus',
      exec: 'live',
      startVUs: 0,
      stages: [
        { duration: SMOKE ? '1s' : '30s', target: SMOKE ? 3 : TARGET.sockets },
        { duration: DURATION, target: SMOKE ? 3 : TARGET.sockets },
      ],
    },
    orders: {
      executor: 'constant-arrival-rate',
      exec: 'orders',
      rate: SMOKE ? 60 : TARGET.ordersPerMinute,
      timeUnit: '1m',
      duration: DURATION,
      preAllocatedVUs: SMOKE ? 2 : 100,
      maxVUs: SMOKE ? 5 : 400,
    },
    panel: {
      executor: 'constant-vus',
      exec: 'panel',
      vus: SMOKE ? 2 : TARGET.restVus,
      duration: DURATION,
    },
  },
  thresholds: {
    // Targets from restaurant/dokoon-restaurant-security-checklist.md item 19.
    'http_req_duration{scenario:panel}': ['p(95)<300'],
    ws_event_delay: ['p(95)<2000'],
    'http_req_duration{scenario:orders}': ['p(95)<800'],
    http_req_failed: ['rate<0.01'],
    ws_connected: ['rate>0.99'],
    orders_accepted: ['rate>0.99'],
    checks: ['rate>0.99'],
  },
};

const auth = (t) => ({ headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } });

/** A restaurant device on shift: ticket → socket held open, counting pushed events. */
export function live() {
  const t = http.post(`${BASE_URL}/r/stream/ticket`, null, auth(TOKEN));
  const ticket = t.status === 200 ? t.json('ticket') : null;
  if (!check(t, { 'ticket 200': () => !!ticket })) {
    wsConnected.add(false);
    sleep(1);
    return;
  }
  let opened = false;
  const res = ws.connect(`${WS_URL}?ticket=${encodeURIComponent(ticket)}`, null, (socket) => {
    socket.on('open', () => (opened = true));
    socket.on('message', (msg) => {
      try {
        const m = JSON.parse(msg);
        if (!m.event) return;
        wsEvents.add(1);
        const placed = Date.parse((m.data && m.data.placedAt) || '');
        if (!Number.isNaN(placed)) wsEventDelay.add(Math.max(0, Date.now() - placed));
      } catch {
        /* not a JSON frame */
      }
    });
    socket.setTimeout(() => socket.close(), WS_HOLD * 1000);
  });
  check(res, { 'ws 101': (r) => r && r.status === 101 });
  // One sample per connection attempt, so the threshold can never pass with zero sockets.
  wsConnected.add(opened && res && res.status === 101);
}

/** A customer places an order and the restaurant accepts it (with an Idempotency-Key, D-96). */
export function orders() {
  const created = http.post(
    `${BASE_URL}/orders`,
    JSON.stringify({
      restaurantId: 'r1',
      items: [{ foodId: 'f1', qty: 1 }],
      addressId: 'a1',
      payment: 'online',
    }),
    auth(CUSTOMER_TOKEN),
  );
  const id = created.status === 201 ? created.json('order.id') : null;
  check(created, { 'order 201': () => !!id });
  if (!id) return ordersAccepted.add(false);
  const accept = http.post(`${BASE_URL}/r/orders/${id}/accept`, JSON.stringify({ prepMinutes: 20 }), {
    headers: { ...auth(TOKEN).headers, 'Idempotency-Key': uuidv4() },
  });
  ordersAccepted.add(accept.status === 200);
  check(accept, { 'accept 200': (r) => r.status === 200 });
}

/** Panel REST traffic: profile, active orders, today's report. */
export function panel() {
  const rs = http.batch([
    ['GET', `${BASE_URL}/r/me`, null, auth(TOKEN)],
    ['GET', `${BASE_URL}/r/orders?status=active`, null, auth(TOKEN)],
    ['GET', `${BASE_URL}/r/reports?period=today`, null, auth(TOKEN)],
  ]);
  check(rs, { 'panel 200': (all) => all.every((r) => r.status === 200) });
  sleep(SMOKE ? 0.5 : 2);
}
