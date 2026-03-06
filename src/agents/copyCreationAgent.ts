import { CopyCreationInput, CopyCreationOutput } from "@/agents/contracts";
import { invokeStructuredLlm } from "@/services/llmProvider";
import { z } from "zod";

const copySchema = z.object({
  copy_variants: z.array(z.string().min(30)).min(3).max(5),
  rationale: z.string().min(15),
});

function sanitizeForbiddenWords(text: string) {
  return text.replace(/\b(segredo|hack|formula)\b/gi, "metodo");
}

function applyConstraints(text: string, constraints: string[]) {
  if (constraints.length === 0) {
    return text.trim();
  }

  return `${text.trim()} Restricoes: ${constraints.join(", ")}.`;
}

function fallbackCopy(input: CopyCreationInput): CopyCreationOutput {
  const constraints =
    input.constraints.length > 0 ? `Restricoes: ${input.constraints.join(", ")}.` : "";
  const baseOpening = `Objetivo: ${input.objective}. Formato: ${input.format}.`;

  const variantA = `${baseOpening} Contexto: decisao orientada por diagnostico. Tese: crescimento sustentavel exige clareza estrategica. Evidencia: processos e criterios explicitos. Implicacao: menos retrabalho e mais previsibilidade. CTA: Agende uma avaliacao inicial.`;
  const variantB = `${baseOpening} Contexto: comunicacao sem direcionamento gera ruido. Tese: posicionamento consistente melhora confianca. Evidencia: pilares editoriais aplicados em toda peca. Implicacao: discurso unificado em canais distintos. CTA: Solicite um plano de acao de 30 dias.`;
  const variantC = `${baseOpening} Contexto: promessas vazias deterioram percepcao de valor. Tese: autoridade nasce de prova concreta. Evidencia: casos e metricas objetivas. Implicacao: aumento de aderencia entre equipe e mercado. CTA: Fale com o time para mapear seus gaps estrategicos.`;

  const cleaned = [variantA, variantB, variantC].map((text) =>
    sanitizeForbiddenWords(text),
  );

  return {
    copy_variants: cleaned.map((text) => `${text} ${constraints}`.trim()),
    rationale:
      "As variantes seguem o manifesto, preservam tom racional e aplicam estrutura padrao de contexto->tese->evidencia->implicacao->cta.",
  };
}

export async function copyCreationAgent(input: CopyCreationInput): Promise<CopyCreationOutput> {
  const llmOutput = await invokeStructuredLlm({
    schema: copySchema,
    instructions: [
      "Voce cria copies estrategicas em pt-BR para clinicas.",
      "Siga manifesto, guia editorial e frameworks.",
      "Nao use palavras proibidas como segredo, hack, formula.",
      "Entregue entre 3 e 5 variantes realmente distintas e acionaveis.",
    ].join(" "),
    context: JSON.stringify(
      {
        objective: input.objective,
        format: input.format,
        constraints: input.constraints,
        manifesto: input.manifesto,
        editorial_guide: input.editorial_guide,
        frameworks: input.frameworks,
      },
      null,
      2,
    ),
  });

  if (llmOutput) {
    return {
      copy_variants: llmOutput.copy_variants.map((variant) =>
        applyConstraints(sanitizeForbiddenWords(variant), input.constraints),
      ),
      rationale: llmOutput.rationale.trim(),
    };
  }

  return fallbackCopy(input);
}
