import { SPECIFICITY_THRESHOLD } from "@/types/domain";
import { EvaluateSpecificityInput, EvaluateSpecificityOutput } from "@/agents/contracts";
import { invokeStructuredLlm } from "@/services/llmProvider";
import { z } from "zod";

const genericMarkers = [
  "qualidade",
  "excelencia",
  "diferenciado",
  "inovador",
  "especial",
  "melhor",
  "top",
  "premium",
  "resultado",
  "transformador",
];

const exampleMarkers = ["por exemplo", "exemplo", "caso", "cliente", "antes e depois", "%", "r$"];

const llmSpecificitySchema = z.object({
  specificity_score: z.number().min(0).max(10),
  is_generic: z.boolean(),
  followups: z.array(z.string().min(5)).max(6).default([]),
  why_generic: z.array(z.string().min(5)).max(6).default([]),
});

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function normalizeLlmOutput(
  output: z.infer<typeof llmSpecificitySchema>,
): EvaluateSpecificityOutput {
  const score = clamp(Number(output.specificity_score.toFixed(1)), 0, 10);
  const isGeneric = score < SPECIFICITY_THRESHOLD || output.is_generic;

  return {
    is_generic: isGeneric,
    specificity_score: score,
    followups: isGeneric ? output.followups.slice(0, 4) : [],
    why_generic: isGeneric ? output.why_generic.slice(0, 4) : [],
  };
}

async function evaluateSpecificityWithLlm(
  input: EvaluateSpecificityInput,
): Promise<EvaluateSpecificityOutput | null> {
  const output = await invokeStructuredLlm({
    schema: llmSpecificitySchema,
    instructions: [
      "Voce e um avaliador de especificidade para onboarding estrategico em pt-BR.",
      "Pontue a resposta de 0 a 10 considerando: dados concretos, contexto real, causalidade e clareza.",
      "Respostas vagas, sem evidencia ou sem exemplos devem perder pontos.",
      `Quando o score for menor que ${SPECIFICITY_THRESHOLD}, retorne is_generic=true e followups acionaveis.`,
      "Followups devem ser objetivos e pedirem fatos verificaveis.",
    ].join(" "),
    context: JSON.stringify(
      {
        step: input.step,
        current_answer: input.current_answer,
        step_history: input.step_history,
      },
      null,
      2,
    ),
  });

  if (!output) {
    return null;
  }

  return normalizeLlmOutput(output);
}

function evaluateSpecificityFallback(
  input: EvaluateSpecificityInput,
): EvaluateSpecificityOutput {
  const answer = input.current_answer.trim();
  let score = 10;
  const why: string[] = [];

  if (answer.length < 80) {
    score -= 3;
    why.push("Resposta curta demais para sustentar contexto estrategico.");
  }

  const hasNumbers = /\d/.test(answer);
  if (!hasNumbers) {
    score -= 1.5;
    why.push("Nao ha dados concretos (numeros, percentuais ou metas).");
  }

  const lower = answer.toLowerCase();
  const genericCount = genericMarkers.filter((word) => lower.includes(word)).length;
  if (genericCount >= 2) {
    score -= 2;
    why.push("Uso excessivo de termos abstratos sem prova observavel.");
  }

  const hasExample = exampleMarkers.some((word) => lower.includes(word));
  if (!hasExample) {
    score -= 1.5;
    why.push("Nao ha exemplo real, situacao concreta ou evidencia de campo.");
  }

  if (input.step_history.length === 0 && answer.length < 120) {
    score -= 1;
    why.push("Primeira resposta da etapa ainda superficial para baseline.");
  }

  score = clamp(Number(score.toFixed(1)), 0, 10);
  const isGeneric = score < SPECIFICITY_THRESHOLD;

  const followups: string[] = [];
  if (isGeneric) {
    followups.push("Descreva um caso real recente com contexto, decisao e resultado.");
    followups.push("Inclua 1 a 3 metricas objetivas que sustentem sua afirmacao.");

    if (!hasExample) {
      followups.push("Qual exemplo de cliente/paciente comprova essa resposta?");
    }

    if (!hasNumbers) {
      followups.push("Quais numeros especificos validam esse ponto (percentual, volume, prazo, ticket)?");
    }
  }

  return {
    is_generic: isGeneric,
    specificity_score: score,
    followups,
    why_generic: isGeneric ? why : [],
  };
}

export async function evaluateSpecificityAgent(
  input: EvaluateSpecificityInput,
): Promise<EvaluateSpecificityOutput> {
  const llmOutput = await evaluateSpecificityWithLlm(input);
  if (llmOutput) {
    return llmOutput;
  }

  return evaluateSpecificityFallback(input);
}
