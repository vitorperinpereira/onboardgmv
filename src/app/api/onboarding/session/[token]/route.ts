import { enforceRateLimit } from "@/app/api/rateLimit";
import { fail, fromError, ok, withApiMetrics } from "@/app/api/utils";
import { getOnboardingSessionByToken } from "@/services/onboardingService";

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  return withApiMetrics("/api/onboarding/session/[token]", async () => {
    const rateLimited = enforceRateLimit({
      request,
      keyPrefix: "onboarding-session-read",
      limit: 240,
      windowMs: 10 * 60 * 1000,
    });
    if (rateLimited) {
      return rateLimited;
    }

    try {
      const { token } = await context.params;
      const session = await getOnboardingSessionByToken(token);

      if (!session) {
        return fail(404, "not_found", "Sessao nao encontrada");
      }

      return ok(session);
    } catch (error) {
      return fromError(error);
    }
  });
}
