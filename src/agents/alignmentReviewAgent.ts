import { AlignmentReviewInput, AlignmentReviewOutput, EditorialGuideOutput } from "@/agents/contracts";
import { invokeStructuredLlm } from "@/services/llmProvider";
import { z } from "zod";

const llmReviewSchema = z.object({
  alignment_score: z.number().min(0).max(10),
  strengths: z.array(z.string().min(5)).max(8).default([]),
  misalignments: z.array(z.string().min(5)).max(8).default([]),
  justification: z.string().min(10),
  suggestions: z.array(z.string().min(5)).max(8).default([]),
});

function includesForbidden(content: string, forbiddenWords: string[]): string[] {
  const lower = content.toLowerCase();
  return forbiddenWords.filter((word) => lower.includes(word.toLowerCase()));
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function fallbackReview(input: AlignmentReviewInput): AlignmentReviewOutput {
  const content = input.content_submitted;
  const lower = content.toLowerCase();
  const guide = (input.session_context.editorial_guide ?? {}) as Partial<EditorialGuideOutput>;
  const forbidden = guide.forbidden_words ?? [];

  const strengths: string[] = [];
  const misalignments: string[] = [];
  const suggestions: string[] = [];

  let score = 8;

  if (content.length < 120) {
    score -= 1.5;
    misalignments.push("Texto curto demais para sustentar argumento estrategico.");
    suggestions.push("Expanda com contexto, tese e evidencia concreta.");
  } else {
    strengths.push("Comprimento minimamente adequado para desenvolvimento da ideia.");
  }

  if (lower.includes("por exemplo") || /\d/.test(content)) {
    strengths.push("Ha indicio de prova ou exemplificacao objetiva.");
  } else {
    score -= 1;
    misalignments.push("Ausencia de evidencias concretas.");
    suggestions.push("Inclua numeros, casos ou recortes de resultado observavel.");
  }

  const forbiddenFound = includesForbidden(content, forbidden);
  if (forbiddenFound.length > 0) {
    score -= 2;
    misalignments.push(`Uso de palavras proibidas: ${forbiddenFound.join(", ")}.`);
    suggestions.push("Substitua por linguagem tecnica e verificavel.");
  }

  if (guide.content_structure_pattern) {
    strengths.push("Revisado com base no padrao estrutural do guia editorial.");
  }

  score = Math.max(0, Math.min(10, Number(score.toFixed(1))));

  const justification =
    score >= 7
      ? "O texto se aproxima do posicionamento esperado e preserva consistencia editorial." 
      : "O texto ainda apresenta desalinhamentos relevantes com o posicionamento estrategico.";

  if (score >= 7 && suggestions.length === 0) {
    suggestions.push("Aprofunde a secao de implicacao pratica para aumentar capacidade de conversao qualificada.");
  }

  return {
    alignment_score: score,
    strengths,
    misalignments,
    justification,
    suggestions,
  };
}

async function llmReview(input: AlignmentReviewInput): Promise<AlignmentReviewOutput | null> {
  const guide = (input.session_context.editorial_guide ?? {}) as Partial<EditorialGuideOutput>;
  const llmOutput = await invokeStructuredLlm({
    schema: llmReviewSchema,
    instructions: [
      "Voce revisa alinhamento editorial de copy em pt-BR.",
      "Compare o texto com manifesto, guia editorial, tom, estrutura e palavras proibidas.",
      "Produza score de 0 a 10 com justificativa objetiva.",
      "Sugestoes devem ser acionaveis e especificas.",
    ].join(" "),
    context: JSON.stringify(
      {
        content_submitted: input.content_submitted,
        manifesto: input.session_context.manifesto,
        editorial_guide: guide,
        frameworks: input.session_context.frameworks,
      },
      null,
      2,
    ),
  });

  if (!llmOutput) {
    return null;
  }

  return {
    alignment_score: clamp(Number(llmOutput.alignment_score.toFixed(1)), 0, 10),
    strengths: llmOutput.strengths.map((item) => item.trim()),
    misalignments: llmOutput.misalignments.map((item) => item.trim()),
    justification: llmOutput.justification.trim(),
    suggestions: llmOutput.suggestions.map((item) => item.trim()),
  };
}

function applyForbiddenGuardrails(
  input: AlignmentReviewInput,
  review: AlignmentReviewOutput,
): AlignmentReviewOutput {
  const guide = (input.session_context.editorial_guide ?? {}) as Partial<EditorialGuideOutput>;
  const forbidden = guide.forbidden_words ?? [];
  const forbiddenFound = includesForbidden(input.content_submitted, forbidden);

  let nextScore = review.alignment_score;
  const nextMisalignments = [...review.misalignments];
  const nextSuggestions = [...review.suggestions];

  if (forbiddenFound.length > 0) {
    nextScore = clamp(nextScore - Math.min(2, forbiddenFound.length * 0.6), 0, 10);

    const forbiddenNote = `Uso de palavras proibidas: ${forbiddenFound.join(", ")}.`;
    if (!nextMisalignments.some((item) => item.toLowerCase().includes("palavras proibidas"))) {
      nextMisalignments.push(forbiddenNote);
    }

    if (!nextSuggestions.some((item) => item.toLowerCase().includes("substitua"))) {
      nextSuggestions.push("Substitua termos proibidos por linguagem tecnica e verificavel.");
    }
  }

  if (nextScore >= 7 && nextSuggestions.length === 0) {
    nextSuggestions.push(
      "Aprofunde a secao de implicacao pratica para aumentar capacidade de conversao qualificada.",
    );
  }

  const justification = review.justification.trim()
    || (nextScore >= 7
      ? "O texto se aproxima do posicionamento esperado e preserva consistencia editorial."
      : "O texto ainda apresenta desalinhamentos relevantes com o posicionamento estrategico.");

  return {
    alignment_score: Number(nextScore.toFixed(1)),
    strengths: review.strengths,
    misalignments: nextMisalignments,
    justification,
    suggestions: nextSuggestions,
  };
}

export async function alignmentReviewAgent(
  input: AlignmentReviewInput,
): Promise<AlignmentReviewOutput> {
  const llmOutput = await llmReview(input);
  if (llmOutput) {
    return applyForbiddenGuardrails(input, llmOutput);
  }

  return fallbackReview(input);
}
