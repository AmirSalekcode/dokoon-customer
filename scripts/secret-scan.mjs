#!/usr/bin/env node
// Secret scanner. Fails if any scanned file contains (a) the value of a non-public key from .env,
// or (b) a well-known secret format. Usage:
//   node scripts/secret-scan.mjs            # scan tracked files
//   node scripts/secret-scan.mjs dist       # scan a build output (CI runs this after `vite build`)
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SECRET_PATTERNS = [
  { name: 'Google API key', re: /AIza[0-9A-Za-z_-]{35}/ },
  { name: 'private key block', re: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: 'GitHub token', re: /gh[pousr]_[A-Za-z0-9]{36,}/ },
  { name: 'live secret key', re: /sk_live_[A-Za-z0-9]{16,}/ },
  { name: 'AWS access key', re: /AKIA[0-9A-Z]{16}/ },
  { name: 'Slack token', re: /xox[baprs]-[A-Za-z0-9-]{10,}/ },
];

const PLACEHOLDERS = new Set(['', 'CHANGE_ME', 'changeme', 'xxx', 'true', 'false', '0', '1']);

/** Minimal .env parser: KEY=value, optional quotes, optional `export`, # comments. */
export function parseDotEnv(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[m[1]] = v;
  }
  return out;
}

/** @param {{file: string, text: string}[]} docs @param {Record<string,string>} env */
export function findSecretLeaks(docs, env) {
  const secrets = Object.entries(env).filter(
    ([k, v]) => !k.startsWith('VITE_') && !PLACEHOLDERS.has(v) && v.length >= 8,
  );
  const leaks = [];
  for (const { file, text } of docs) {
    const hit = secrets.find(([, v]) => text.includes(v));
    if (hit) {
      leaks.push({ file, reason: `value of ${hit[0]}` });
      continue;
    }
    const p = SECRET_PATTERNS.find((x) => x.re.test(text));
    if (p) leaks.push({ file, reason: p.name });
  }
  return leaks;
}

function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = path.join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const target = process.argv[2];
  const files = target
    ? walk(path.resolve(root, target))
    : execSync('git ls-files', { cwd: root })
        .toString()
        .split('\n')
        .filter(Boolean)
        .map((f) => path.join(root, f));
  const docs = files
    .filter(
      (f) =>
        !/\.(png|jpg|ttf|woff2?|jar|apk|keystore)$/.test(f) &&
        !f.includes(`${path.sep}prototype${path.sep}`) &&
        !f.endsWith('package-lock.json'),
    )
    .map((f) => ({ file: path.relative(root, f), text: readFileSync(f, 'utf8') }));
  const envFile = path.join(root, '.env');
  const env = {
    ...(existsSync(envFile) ? parseDotEnv(readFileSync(envFile, 'utf8')) : {}),
    ...pickSecretEnv(process.env),
  };
  const leaks = findSecretLeaks(docs, env);
  if (leaks.length) {
    console.error('Secret scan FAILED:');
    for (const l of leaks) console.error(`  ${l.file}: ${l.reason}`);
    process.exit(1);
  }
  console.log(`Secret scan OK (${docs.length} files${target ? ` in ${target}` : ''}).`);
}

/** In CI, secrets arrive as env vars; only check names we declare in .env.example. */
function pickSecretEnv(penv) {
  const names = [
    'ZIBAL_MERCHANT_KEY',
    'ZARINPAL_MERCHANT_ID',
    'SMS_API_KEY',
    'FCM_SERVER_KEY',
    'WEBPUSH_VAPID_PRIVATE_KEY',
    'ANDROID_KEYSTORE_PASSWORD',
    'ANDROID_KEY_PASSWORD',
  ];
  return Object.fromEntries(names.filter((n) => penv[n]).map((n) => [n, penv[n]]));
}
