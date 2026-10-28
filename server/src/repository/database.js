import { dump, load } from './snapshot.js';

/**
 * Optional Redis database (Upstash, connected through Vercel).
 * Without it the app keeps data in memory only. With it, every request first loads the
 * latest data and every change is saved before the response is sent, so all server
 * instances (Vercel runs several) see the same data and nothing is lost on restart.
 */
const URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY = 'expense-splitter:db';

export const databaseEnabled = Boolean(URL && TOKEN);
let localVersion = 0;

async function redis(...command) {
  const res = await fetch(URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command)
  });
  if (!res.ok) throw new Error(`Redis error ${res.status}`);
  return (await res.json()).result;
}

async function pull() {
  const text = await redis('GET', KEY);
  if (!text) return;
  const stored = JSON.parse(text);
  if (stored.version !== localVersion) {
    load(stored.data);
    localVersion = stored.version;
  }
}

async function push() {
  localVersion = Date.now() + Math.random();
  await redis('SET', KEY, JSON.stringify({ version: localVersion, data: dump() }));
}

// One request at a time per instance, so a load never lands in the middle of a change
let queue = Promise.resolve();

export function databaseMiddleware(req, res, next) {
  if (!databaseEnabled) return next();
  const mutating = req.method !== 'GET';
  queue = queue.then(() => new Promise((release) => {
    res.on('finish', release);
    res.on('close', release);
    if (mutating) {
      // Save the changes before the response leaves, so the next request sees them
      const end = res.end.bind(res);
      res.end = (...args) => {
        const ok = res.statusCode < 400;
        (ok ? push() : Promise.resolve()).catch((err) => console.error('Database save failed', err))
          .finally(() => end(...args));
        return res;
      };
    }
    pull().then(() => next(), next);
  }));
}

export async function databaseStatus() {
  if (!databaseEnabled) return { database: 'In-memory (no database configured)', connected: false };
  try {
    await redis('PING');
    return { database: 'Upstash Redis', connected: true };
  } catch {
    return { database: 'Upstash Redis', connected: false };
  }
}
