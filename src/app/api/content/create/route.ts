import { NextRequest } from "next/server";
import { enforceRateLimit } from "@/app/api/rateLimit";
import { fromError, ok, withApiMetrics } from "@/app/api/utils";
import { assertAdminRequest } from "@/services/auth";
import { sanitizeStringArray, sanitizeText } from "@/services/sanitize";
import { createCopy } from "@/services/contentService";
import { createCopySchema } from "@/types/domain";

export async function POST(request: NextRequest) {
  return withApiMetrics("/api/content/create", async () => {
    const authError = assertAdminRequest(request);
    if (authError) {
      return authError;
    }

    const rateLimited = enforceRateLimit({
      request,
      keyPrefix: "admin-create-copy",
      limit: 120,
      windowMs: 10 * 60 * 1000,
    });
    if (rateLimited) {
      return rateLimited;
    }

    try {
      const payload = createCopySchema.parse(await request.json());
      const output = await createCopy({
        sessionId: payload.session_id,
        objective: sanitizeText(payload.objective),
        format: sanitizeText(payload.format),
        constraints: sanitizeStringArray(payload.constraints),
      });

      return ok(output);
    } catch (error) {
      return fromError(error);
    }
  });
}
