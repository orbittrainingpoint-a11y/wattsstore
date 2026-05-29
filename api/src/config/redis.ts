/** Shared ioredis clients. One for general cache/data, separate connections for BullMQ. */
import Redis, { RedisOptions } from 'ioredis';
import { env } from './env';
import { logger } from './logger';

const baseOptions: RedisOptions = {
  maxRetriesPerRequest: null, // required by BullMQ for its connections
  enableReadyCheck: true,
};

export const redis = new Redis(env.REDIS_URL, { ...baseOptions, maxRetriesPerRequest: 3 });

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (err) => logger.error('Redis error', { error: err.message }));

/** BullMQ requires a connection with maxRetriesPerRequest=null. Use a factory per queue/worker. */
export function createBullConnection(): Redis {
  return new Redis(env.REDIS_URL, baseOptions);
}

// ── Cache helpers ──
export async function cacheGet<T>(key: string): Promise<T | null> {
  const raw = await redis.get(key);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
}

export async function cacheDel(...keys: string[]): Promise<void> {
  if (keys.length) await redis.del(...keys);
}

/** Delete every key matching a glob pattern (e.g. `product:*`). Uses SCAN to avoid blocking. */
export async function cacheDelPattern(pattern: string): Promise<void> {
  const stream = redis.scanStream({ match: pattern, count: 100 });
  const pipeline = redis.pipeline();
  let found = 0;
  for await (const keys of stream) {
    for (const k of keys as string[]) {
      pipeline.del(k);
      found++;
    }
  }
  if (found) await pipeline.exec();
}
