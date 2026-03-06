import { NextRequest } from "next/server";
import { fromError, ok, withApiMetrics } from "@/app/api/utils";
import { enforceRateLimit } from "@/app/api/rateLimit";
import { sanitizeText } from "@/services/sanitize";
import { scheduleMetricsSnapshot } from "@/services/maintenanceScheduler";
import { createOnboardingSession } from "@/services/onboardingService";
import { createSessionSchema } from "@/types/domain";

export async function POST(request: NextRequest) {
  return withApiMetrics("/api/onboarding/session", async () => {
    const rateLimited = enforceRateLimit({
      request,
      keyPrefix: "onboarding-session",
      limit: 20,
      windowMs: 10 * 60 * 1000,
    });
    if (rateLimited) {
      return rateLimited;
    }

    try {
      const payload = createSessionSchema.parse(await request.json());
      const result = await createOnboardingSession({
        client_name: sanitizeText(payload.client_name),
        clinic_name: sanitizeText(payload.clinic_name),
        email: sanitizeText(payload.email),
      });

      scheduleMetricsSnapshot("session_created");
      return ok(result, 201);
    } catch (error) {
      return fromError(error);
    }
  });
}
