// k6 load test of the static web server (nginx in Docker, or `vite preview`).
// Run: k6 run perf/static-load.js   (env BASE_URL, VUS, DURATION)
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:4173';

export const options = {
  scenarios: {
    load: {
      executor: 'ramping-vus',
      stages: [
        { duration: '10s', target: Number(__ENV.VUS || 20) },
        { duration: __ENV.DURATION || '20s', target: Number(__ENV.VUS || 20) },
        { duration: '5s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<300'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
  },
};

export function setup() {
  const res = http.get(`${BASE_URL}/`);
  if (res.status !== 200) throw new Error(`${BASE_URL} not reachable (status ${res.status}): ${res.error}`);
  const html = res.body;
  const assets = [...String(html).matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]);
  if (assets.length === 0) throw new Error('no hashed assets found in index.html');
  return { assets };
}

export default function ({ assets }) {
  const res = http.get(`${BASE_URL}/`);
  check(res, { 'index 200': (r) => r.status === 200, 'is rtl': (r) => String(r.body).includes('dir="rtl"') });
  const batch = http.batch([
    ...assets.map((a) => ['GET', `${BASE_URL}${a}`]),
    ['GET', `${BASE_URL}/manifest.webmanifest`],
  ]);
  check(batch, { 'assets 200': (rs) => rs.every((r) => r.status === 200) });
  // SPA deep link must fall back to index.html.
  // Sent like a browser navigation (Accept: text/html), which is what the SPA fallback serves.
  check(http.get(`${BASE_URL}/some/deep/link`, { headers: { Accept: 'text/html' } }), {
    'spa fallback 200': (r) => r.status === 200,
  });
  sleep(1);
}
