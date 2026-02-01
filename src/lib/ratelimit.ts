import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { redis as ioRedis } from './redis';
import { RateLimitError } from './errors';

// Use Upstash Redis if configured, otherwise use ioredis
function getRedisClient() {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return Redis.fromEnv();
  }
  // For local development, create a custom adapter
  return {
    eval: async (...args: unknown[]) => {
      // @ts-expect-error - ioredis eval signature differs
      return ioRedis.eval(...args);
    },
  } as unknown as Redis;
}

const redisClient = getRedisClient();

// Rate limiters per the specification
export const rateLimiters = {
  // POST /api/auth/register - 3 per hour per IP
  register: new Ratelimit({
    redis: redisClient,
    limiter: Ratelimit.slidingWindow(3, '1h'),
    prefix: 'ratelimit:register',
  }),

  // POST /api/auth/login - 5 per 15 min per IP+email
  login: new Ratelimit({
    redis: redisClient,
    limiter: Ratelimit.slidingWindow(5, '15m'),
    prefix: 'ratelimit:login',
  }),

  // POST /api/bots - 3 per 24 hours per userId
  botCreate: new Ratelimit({
    redis: redisClient,
    limiter: Ratelimit.slidingWindow(3, '24h'),
    prefix: 'ratelimit:bot-create',
  }),

  // POST /api/qualification - 1 per hour per botId
  qualification: new Ratelimit({
    redis: redisClient,
    limiter: Ratelimit.slidingWindow(1, '1h'),
    prefix: 'ratelimit:qualification',
  }),

  // Global API limit - 100 per minute per IP
  global: new Ratelimit({
    redis: redisClient,
    limiter: Ratelimit.slidingWindow(100, '1m'),
    prefix: 'ratelimit:global',
  }),
};

export type RateLimiterKey = keyof typeof rateLimiters;

export async function checkRateLimit(
  limiterKey: RateLimiterKey,
  identifier: string
): Promise<void> {
  const limiter = rateLimiters[limiterKey];
  const { success, reset } = await limiter.limit(identifier);

  if (!success) {
    const retryAfter = Math.ceil((reset - Date.now()) / 1000);
    throw new RateLimitError(
      `Rate limit exceeded. Try again in ${retryAfter} seconds.`
    );
  }
}

export async function getRateLimitInfo(
  limiterKey: RateLimiterKey,
  identifier: string
): Promise<{ remaining: number; reset: number }> {
  const limiter = rateLimiters[limiterKey];
  const { remaining, reset } = await limiter.limit(identifier);
  return { remaining, reset };
}
