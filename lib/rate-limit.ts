import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null;

const ratelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "60 s"),
      prefix: "ratelimit",
    })
  : null;

export type RateLimitResult = { success: true } | { success: false; retryAfterSeconds: number };

export async function checkRateLimit(userId: string): Promise<RateLimitResult> {
  if (!ratelimit) return { success: true };

  const { success, reset } = await ratelimit.limit(userId);
  if (success) return { success: true };

  const retryAfterSeconds = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  return { success: false, retryAfterSeconds };
}

const CONCURRENCY_LOCK_TTL_SECONDS = 30;

export class ConcurrencyLimitError extends Error {
  constructor() {
    super("concurrency limit exceeded");
    this.name = "ConcurrencyLimitError";
  }
}

// ユーザーごとに同時1リクエストまでに制限する簡易セマフォ
export async function withConcurrencyLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  if (!redis) return fn();

  const lockKey = `concurrency-lock:${userId}`;
  const acquired = await redis.set(lockKey, "1", {
    nx: true,
    ex: CONCURRENCY_LOCK_TTL_SECONDS,
  });
  if (!acquired) {
    throw new ConcurrencyLimitError();
  }

  try {
    return await fn();
  } finally {
    await redis.del(lockKey);
  }
}
