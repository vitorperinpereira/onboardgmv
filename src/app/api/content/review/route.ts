import { NextRequest } from "next/server";
import { enforceRateLimit } from "@/app/api/rateLimit";
import { fromError, ok, withApiMetrics } from "@/app/api/utils";
import { assertAdminRequest } from "@/services/auth";
import { sanitizeText } from "@/services/sanitize";
import { reviewContent } from "@/services/contentService";
import { reviewContentSchema } from "@/types/domain";

export async function POST(request: NextRequest) {
  return withApiMetrics("/api/content/review", async () => {
    const authError = assertAdminRequest(request);
    if (authError) {
      return authError;
    }

    const rateLimited = enforceRateLimit({
      request,
      keyPrefix: "admin-review",
      limit: 100,
      windowMs: 10 * 60 * 1000,
    });
    if (rateLimited) {
      return rateLimited;
    }

    try {
      const payload = reviewContentSchema.parse(await request.json());
      const review = await reviewContent({
        sessionId: payload.session_id,
        contentSubmitted: sanitizeText(payload.content_submitted),
      });

      return ok(review);
    } catch (error) {
      return fromError(error);
    }
  });
}
