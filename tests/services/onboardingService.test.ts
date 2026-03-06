import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryOnboardingRepository } from "@/repositories/inMemoryRepository";
import { resetRepository, setRepository } from "@/repositories";
import {
  createOnboardingSession,
  getOnboardingSessionByToken,
  submitOnboardingAnswer,
} from "@/services/onboardingService";

describe("onboardingService", () => {
  beforeEach(() => {
    resetRepository();
    setRepository(new InMemoryOnboardingRepository());
  });

  it("creates session and returns initial state", async () => {
    const created = await createOnboardingSession({
      client_name: "Isabella",
      clinic_name: "GMV Clinic",
      email: "isa@gmv.com",
    });

    const loaded = await getOnboardingSessionByToken(created.token);

    expect(created.session_id).toBeTruthy();
    expect(loaded?.current_step).toBe("essencia");
    expect(loaded?.progress).toBe(0);
  });

  it("keeps user in current step when answer is generic", async () => {
    const created = await createOnboardingSession({
      client_name: "Isabella",
      clinic_name: "GMV Clinic",
      email: "isa@gmv.com",
    });

    const response = await submitOnboardingAnswer({
      token: created.token,
      step: "essencia",
      answers: { response: "Somos melhores e inovadores." },
    });

    expect(response?.accepted).toBe(false);
    expect(response?.next_step).toBe("essencia");
    expect(response?.followups.length).toBeGreaterThan(0);
  });

  it("unlocks step after repeated generic attempts with contextual response", async () => {
    const created = await createOnboardingSession({
      client_name: "Isabella",
      clinic_name: "GMV Clinic",
      email: "isa@gmv.com",
    });

    const firstAttempt = await submitOnboardingAnswer({
      token: created.token,
      step: "essencia",
      answers: { response: "Somos melhores e inovadores." },
    });

    expect(firstAttempt?.accepted).toBe(false);

    const secondAttempt = await submitOnboardingAnswer({
      token: created.token,
      step: "essencia",
      answers: {
        response:
          "Nosso foco e previsibilidade de resultado para queda capilar cronica, com protocolo em etapas e acompanhamento semanal do plano.",
      },
    });

    expect(secondAttempt?.accepted).toBe(true);
    expect(secondAttempt?.next_step).toBe("posicionamento");
    expect(secondAttempt?.specificity_score).toBeGreaterThanOrEqual(7);
  });
});
