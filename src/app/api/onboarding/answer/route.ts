import { NextRequest } from "next/server";
import { enforceRateLimit } from "@/app/api/rateLimit";
import { fail, fromError, ok, withApiMetrics } from "@/app/api/utils";
import { sanitizeText } from "@/services/sanitize";
import { scheduleHousekeeping, scheduleMetricsSnapshot } from "@/services/maintenanceScheduler";
import { submitOnboardingAnswer } from "@/services/onboardingService";
import { submitAnswerSchema } from "@/types/domain";

export async function POST(request: NextRequest) {
  return withApiMetrics("/api/onboarding/answer", async () => {
    try {
      const payload = submitAnswerSchema.parse(await request.json());

      const rateLimited = enforceRateLimit({
        request,
        keyPrefix: "onboarding-answer",
        keySuffix: payload.token,
        limit: 80,
        windowMs: 10 * 60 * 1000,
      });
      if (rateLimited) {
        return rateLimited;
      }

      const result = await submitOnboardingAnswer({
        ...payload,
        answers: {
          response: sanitizeText(payload.answers.response),
        },
      });

      if (!result) {
        return fail(404, "not_found", "Sessao nao encontrada");
      }

      scheduleMetricsSnapshot("onboarding_answer_submitted");
      scheduleHousekeeping("onboarding_answer_submitted");

      return ok(result);
    } catch (error) {
      return fromError(error);
    }
  });
}
