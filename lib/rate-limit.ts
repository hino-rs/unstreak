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

async function checkLimit(limiter: Ratelimit | null, key: string): Promise<RateLimitResult> {
  if (!limiter) return { success: true };

  const { success, reset } = await limiter.limit(key);
  if (success) return { success: true };

  const retryAfterSeconds = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  return { success: false, retryAfterSeconds };
}

export async function checkRateLimit(userId: string): Promise<RateLimitResult> {
  return checkLimit(ratelimit, userId);
}

// ログイン/サインアップ試行のブルートフォース対策。認証前なのでuser.idではなく
// IPアドレス(+ログインはメールアドレス、アカウント単位の集中攻撃対策)をキーにする
const authIpRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "60 s"),
      prefix: "ratelimit-auth-ip",
    })
  : null;

const authEmailRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "300 s"),
      prefix: "ratelimit-auth-email",
    })
  : null;

export async function checkAuthIpRateLimit(ip: string): Promise<RateLimitResult> {
  return checkLimit(authIpRatelimit, ip);
}

export async function checkAuthEmailRateLimit(email: string): Promise<RateLimitResult> {
  return checkLimit(authEmailRatelimit, email.toLowerCase());
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
