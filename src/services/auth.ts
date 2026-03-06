import { NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";
import { env } from "@/lib/env";

function safeEquals(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function getTokenFromRequest(request: NextRequest): string | null {
  const directToken = request.headers.get("x-admin-token");
  if (directToken) {
    return directToken;
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authHeader.slice(7).trim();
}

export function isAdminRequest(request: NextRequest): boolean {
  const token = getTokenFromRequest(request);
  if (!token) {
    return false;
  }

  return safeEquals(token, env.adminApiToken);
}

export function assertAdminRequest(request: NextRequest): Response | null {
  if (isAdminRequest(request)) {
    return null;
  }

  return Response.json(
    {
      error: "unauthorized",
      message: "Admin token invalido ou ausente.",
    },
    { status: 401 },
  );
}
