import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIdentifier } from "@/services/rateLimit";

export function enforceRateLimit(input: {
  request: Request | NextRequest;
  keyPrefix: string;
  limit: number;
  windowMs: number;
  keySuffix?: string;
}): NextResponse | null {
  const headers = input.request.headers;
  const client = getClientIdentifier(headers);
  const key = `${input.keyPrefix}:${client}:${input.keySuffix ?? "default"}`;

  const result = checkRateLimit({
    key,
    limit: input.limit,
    windowMs: input.windowMs,
  });

  if (result.allowed) {
    return null;
  }

  return NextResponse.json(
    {
      error: "rate_limited",
      details: `Muitas requisicoes. Tente novamente em ${result.retryAfterSeconds}s.`,
    },
    {
      status: 429,
      headers: {
        "retry-after": String(result.retryAfterSeconds),
      },
    },
  );
}
