import { alignmentReviewAgent } from "@/agents/alignmentReviewAgent";
import { copyCreationAgent } from "@/agents/copyCreationAgent";
import { getRepository } from "@/repositories";

export async function reviewContent(input: { sessionId: string; contentSubmitted: string }) {
  const repository = getRepository();
  const context = await repository.getSessionContext(input.sessionId);

  if (!context || !context.strategicDocument) {
    throw new Error("Documento estrategico nao encontrado para a sessao.");
  }

  const review = await alignmentReviewAgent({
    session_context: {
      manifesto: context.strategicDocument.manifesto,
      editorial_guide: context.strategicDocument.editorial_guide,
      frameworks: context.strategicDocument.frameworks,
      internal_diagnosis: context.strategicDocument.internal_diagnosis,
    },
    content_submitted: input.contentSubmitted,
  });

  await repository.saveContentReview({
    session_id: input.sessionId,
    content_submitted: input.contentSubmitted,
    alignment_score: review.alignment_score,
    strengths: review.strengths,
    misalignments: review.misalignments,
    justification: review.justification,
    suggestions: review.suggestions,
  });

  return review;
}

export async function createCopy(input: {
  sessionId: string;
  objective: string;
  format: string;
  constraints: string[];
}) {
  const repository = getRepository();
  const context = await repository.getSessionContext(input.sessionId);

  if (!context || !context.strategicDocument) {
    throw new Error("Documento estrategico nao encontrado para a sessao.");
  }

  const result = await copyCreationAgent({
    manifesto: {
      manifesto_long: context.strategicDocument.manifesto,
      manifesto_short: context.strategicDocument.manifesto_short,
      positioning_statement: "Aderencia ao posicionamento estrategico da sessao.",
    },
    editorial_guide: context.strategicDocument.editorial_guide as never,
    frameworks: context.strategicDocument.frameworks,
    objective: input.objective,
    format: input.format,
    constraints: input.constraints,
  });

  await repository.saveCopyGeneration({
    session_id: input.sessionId,
    objective: input.objective,
    format: input.format,
    constraints: input.constraints,
    copy_variants: result.copy_variants,
    rationale: result.rationale,
  });

  return result;
}
