import { NextRequest } from "next/server";
import { enforceRateLimit } from "@/app/api/rateLimit";
import { fromError, ok, withApiMetrics } from "@/app/api/utils";
import { getRepository } from "@/repositories";
import { assertAdminRequest } from "@/services/auth";

export async function GET(request: NextRequest) {
  return withApiMetrics("/api/admin/sessions", async () => {
    const authError = assertAdminRequest(request);
    if (authError) {
      return authError;
    }

    const rateLimited = enforceRateLimit({
      request,
      keyPrefix: "admin-sessions",
      limit: 180,
      windowMs: 10 * 60 * 1000,
    });
    if (rateLimited) {
      return rateLimited;
    }

    try {
      const sessions = await getRepository().listSessions();
      return ok({
        sessions,
      });
    } catch (error) {
      return fromError(error);
    }
  });
}
