import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { logger } from "@/lib/logger";
import { recordApiMetric } from "@/services/observability";

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(status: number, error: string, details?: unknown) {
  return NextResponse.json({ error, details }, { status });
}

export function fromError(error: unknown) {
  if (error instanceof ZodError) {
    return fail(400, "validation_error", error.issues);
  }

  logger.error({ error }, "Unhandled API error");
  return fail(500, "internal_error", "Unexpected server error");
}

export async function withApiMetrics(route: string, handler: () => Promise<Response> | Response) {
  const startedAt = Date.now();
  let statusCode = 500;

  try {
    const response = await handler();
    statusCode = response.status;
    return response;
  } finally {
    recordApiMetric(route, statusCode, Date.now() - startedAt);
  }
}
