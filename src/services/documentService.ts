import { runStrategicGraph } from "@/graph/strategicGraph";
import { getRepository } from "@/repositories";
import { onboardingSteps, OnboardingStep, StrategicDocumentRecord } from "@/types/domain";

const documentsCache = new Map<string, { expiresAt: number; value: StrategicDocumentRecord }>();
const CACHE_TTL_MS = 60_000;

function buildStructuredOnboarding(
  responses: Array<{ step: OnboardingStep; answers: Record<string, unknown>; specificity_score: number; is_partial: boolean }>,
) {
  const structured = {} as Record<OnboardingStep, string>;

  for (const step of onboardingSteps) {
    const candidates = responses
      .filter((response) => response.step === step)
      .sort((a, b) => b.specificity_score - a.specificity_score);

    const best = candidates.find((candidate) => !candidate.is_partial) ?? candidates[0];

    if (!best) {
      throw new Error(`Resposta ausente para a etapa ${step}.`);
    }

    structured[step] = String(best.answers.response ?? "");
  }

  return structured;
}

export async function generateStrategicDocuments(sessionId: string) {
  const repository = getRepository();
  const context = await repository.getSessionContext(sessionId);

  if (!context) {
    throw new Error("Sessao nao encontrada.");
  }

  const onboarding = buildStructuredOnboarding(context.responses as never);
  const outputs = await runStrategicGraph(onboarding);

  const saved = await repository.saveStrategicDocument({
    session_id: sessionId,
    manifesto: outputs.manifesto.manifesto_long,
    manifesto_short: outputs.manifesto.manifesto_short,
    editorial_guide: outputs.editorialGuide,
    frameworks: outputs.frameworks,
    internal_diagnosis: outputs.internalDiagnosis,
  });

  documentsCache.set(sessionId, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    value: saved,
  });

  return {
    session_id: sessionId,
    manifesto: outputs.manifesto.manifesto_long,
    manifesto_short: outputs.manifesto.manifesto_short,
    positioning_statement: outputs.manifesto.positioning_statement,
    editorial_guide: outputs.editorialGuide,
    frameworks: outputs.frameworks,
    internal_diagnosis: outputs.internalDiagnosis,
    saved_id: saved.id,
  };
}

export async function getStrategicDocuments(sessionId: string) {
  const cached = documentsCache.get(sessionId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const repository = getRepository();
  const value = await repository.getStrategicDocument(sessionId);

  if (value) {
    documentsCache.set(sessionId, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      value,
    });
  }

  return value;
}

export function cleanupExpiredDocumentCache() {
  const now = Date.now();
  let removed = 0;
  const before = documentsCache.size;

  for (const [sessionId, cached] of documentsCache.entries()) {
    if (cached.expiresAt <= now) {
      documentsCache.delete(sessionId);
      removed += 1;
    }
  }

  return {
    before,
    after: documentsCache.size,
    removed,
  };
}
