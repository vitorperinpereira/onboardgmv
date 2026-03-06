import { beforeEach, describe, expect, it } from "vitest";
import { createOnboardingSession, submitOnboardingAnswer } from "@/services/onboardingService";
import { resetRepository, setRepository } from "@/repositories";
import { InMemoryOnboardingRepository } from "@/repositories/inMemoryRepository";
import { getOperationalMetrics } from "@/services/metricsService";
import { resetApiMetrics } from "@/services/observability";

const completeAnswers = {
  essencia:
    "Por exemplo, atendemos 248 pacientes em 12 meses, com 39% de retorno em 90 dias e ticket medio de R$ 1.820 sustentado por base auditada.",
  posicionamento:
    "Nosso posicionamento e orientado por evidencia clinica: em 2025, tres protocolos tiveram adesao media de 78% com criterio de entrada documentado.",
  publico:
    "Publico principal de 28 a 52 anos, com queda cronica e alta exigencia por previsibilidade; por exemplo, 64% chegam por indicacao medica qualificada.",
  prova:
    "Temos 137 casos auditados com melhoria observavel em 71% apos 120 dias, incluindo registro fotografico e revisao mensal dos desfechos.",
  personalidade:
    "Comunicacao tecnica e humana, sem urgencia artificial; por exemplo, 92% das pecas de 2025 mantiveram tom racional e CTA de avaliacao orientada.",
  futuro:
    "Meta para 18 meses: elevar recorrencia em 22% e reduzir retrabalho em 15%, com revisoes trimestrais e indicadores de qualidade acompanhados.",
} as const;

describe("metricsService", () => {
  beforeEach(() => {
    resetRepository();
    setRepository(new InMemoryOnboardingRepository());
    resetApiMetrics();
  });

  it("returns session and queue metrics", async () => {
    const completed = await createOnboardingSession({
      client_name: "Isa",
      clinic_name: "GMV",
      email: "isa@gmv.com",
    });

    for (const [step, response] of Object.entries(completeAnswers)) {
      await submitOnboardingAnswer({
        token: completed.token,
        step: step as keyof typeof completeAnswers,
        answers: { response },
      });
    }

    await createOnboardingSession({
      client_name: "Ana",
      clinic_name: "GMV B",
      email: "ana@gmv.com",
    });

    const metrics = await getOperationalMetrics();

    expect(metrics.sessions.total).toBe(2);
    expect(metrics.sessions.completed).toBe(1);
    expect(metrics.sessions.in_progress).toBe(1);
    expect(metrics.sessions.completion_rate).toBe(50);
    expect(typeof metrics.queue.waiting).toBe("number");
    expect(metrics.api.overall.tracked_routes).toBe(0);
  });
});
