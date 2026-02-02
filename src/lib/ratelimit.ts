import { redis } from './redis';
import { RateLimitError } from './errors';

// Simple rate limiter config
const RATE_LIMITS = {
  // POST /api/auth/register - 3 per hour per IP
  register: { max: 3, windowSec: 3600 },
  // POST /api/auth/login - 5 per 15 min per IP
  login: { max: 5, windowSec: 900 },
  // POST /api/bots - 3 per 24 hours per userId
  botCreate: { max: 3, windowSec: 86400 },
  // POST /api/qualification - 1 per hour per botId
  qualification: { max: 1, windowSec: 3600 },
  // Global API limit - 100 per minute per IP
  global: { max: 100, windowSec: 60 },
};

export type RateLimiterKey = keyof typeof RATE_LIMITS;

export async function checkRateLimit(
  limiterKey: RateLimiterKey,
  identifier: string
): Promise<void> {
  const config = RATE_LIMITS[limiterKey];
  const key = `ratelimit:${limiterKey}:${identifier}`;

  try {
    const current = await redis.incr(key);

    if (current === 1) {
      // First request, set expiry
      await redis.expire(key, config.windowSec);
    }

    if (current > config.max) {
      const ttl = await redis.ttl(key);
      throw new RateLimitError(
        `Rate limit exceeded. Try again in ${ttl} seconds.`
      );
    }
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw error;
    }
    // If Redis is down, log and continue (fail open)
    console.warn('Rate limit check failed:', error);
  }
}

export async function getRateLimitInfo(
  limiterKey: RateLimiterKey,
  identifier: string
): Promise<{ remaining: number; reset: number }> {
  const config = RATE_LIMITS[limiterKey];
  const key = `ratelimit:${limiterKey}:${identifier}`;

  try {
    const current = parseInt(await redis.get(key) || '0', 10);
    const ttl = await redis.ttl(key);

    return {
      remaining: Math.max(0, config.max - current),
      reset: ttl > 0 ? Date.now() + ttl * 1000 : Date.now() + config.windowSec * 1000,
    };
  } catch {
    return {
      remaining: config.max,
      reset: Date.now() + config.windowSec * 1000,
    };
  }
}
