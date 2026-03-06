const store = new Map<string, { count: number; resetAt: number }>();

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

function now() {
  return Date.now();
}

export function checkRateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
}): RateLimitResult {
  const current = store.get(input.key);
  const currentTime = now();

  if (!current || current.resetAt <= currentTime) {
    store.set(input.key, {
      count: 1,
      resetAt: currentTime + input.windowMs,
    });

    return {
      allowed: true,
      remaining: input.limit - 1,
      retryAfterSeconds: Math.ceil(input.windowMs / 1000),
    };
  }

  if (current.count >= input.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - currentTime) / 1000)),
    };
  }

  current.count += 1;
  store.set(input.key, current);

  return {
    allowed: true,
    remaining: Math.max(0, input.limit - current.count),
    retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - currentTime) / 1000)),
  };
}

export function getClientIdentifier(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  return headers.get("x-real-ip") || headers.get("cf-connecting-ip") || "unknown";
}

export function resetRateLimitStore() {
  store.clear();
}
