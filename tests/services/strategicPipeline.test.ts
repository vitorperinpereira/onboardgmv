import { beforeEach, describe, expect, it } from "vitest";
import { createCopy, reviewContent } from "@/services/contentService";
import { generateStrategicDocuments, getStrategicDocuments } from "@/services/documentService";
import { resetRepository, setRepository } from "@/repositories";
import { InMemoryOnboardingRepository } from "@/repositories/inMemoryRepository";
import { createOnboardingSession, submitOnboardingAnswer } from "@/services/onboardingService";

const specificAnswers = {
  essencia:
    "Por exemplo, atendemos 248 pacientes nos ultimos 12 meses, com 39% de retorno em 90 dias e ticket medio de R$ 1.820.",
  posicionamento:
    "Nosso posicionamento prioriza evidencia clinica, com protocolos auditados e taxa de adesao acima de 78% ao longo de 2025.",
  publico:
    "Publico principal de 28 a 52 anos com queda cronica e alta exigencia por previsibilidade de resultado e clareza no plano.",
  prova:
    "Mantemos base de 137 casos auditados, com melhora observavel em 71% apos 120 dias e reavaliacao estruturada.",
  personalidade:
    "Tom tecnico e empatico, sem urgencia artificial. Em 92% das pecas o discurso foi consistente com o posicionamento.",
  futuro:
    "Meta de elevar recorrencia em 22% nos proximos 18 meses, mantendo qualidade de diagnostico e padrao editorial.",
} as const;

describe("strategic pipeline", () => {
  beforeEach(() => {
    resetRepository();
    setRepository(new InMemoryOnboardingRepository());
  });

  it("runs end-to-end strategic generation, review and copy creation", async () => {
    const created = await createOnboardingSession({
      client_name: "Isa",
      clinic_name: "GMV",
      email: "isa@gmv.com",
    });

    for (const [step, response] of Object.entries(specificAnswers)) {
      const result = await submitOnboardingAnswer({
        token: created.token,
        step: step as keyof typeof specificAnswers,
        answers: { response },
      });

      expect(result?.accepted).toBe(true);
    }

    const documents = await generateStrategicDocuments(created.session_id);
    expect(documents.manifesto.length).toBeGreaterThan(40);
    expect(Array.isArray(documents.editorial_guide.pillars)).toBe(true);

    const cached = await getStrategicDocuments(created.session_id);
    expect(cached?.manifesto).toBeTruthy();

    const review = await reviewContent({
      sessionId: created.session_id,
      contentSubmitted:
        "Por exemplo, em 90 dias acompanhamos 48 pacientes e elevamos aderencia em 18% com comunicacao orientada por evidencia.",
    });

    expect(typeof review.alignment_score).toBe("number");
    expect(review.justification.length).toBeGreaterThan(10);

    const copy = await createCopy({
      sessionId: created.session_id,
      objective: "Gerar roteiro para anuncio institucional",
      format: "video",
      constraints: ["sem hype", "tom racional"],
    });

    expect(copy.copy_variants.length).toBeGreaterThanOrEqual(3);
  });
});
