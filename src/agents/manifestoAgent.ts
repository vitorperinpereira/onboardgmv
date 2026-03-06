import { ManifestoInput, ManifestoOutput } from "@/agents/contracts";
import { invokeStructuredLlm } from "@/services/llmProvider";
import { z } from "zod";

const forbiddenWords = ["segredo", "hack", "formula"];

const manifestoSchema = z.object({
  manifesto_long: z.string().min(120),
  manifesto_short: z.string().min(20).max(260),
  positioning_statement: z.string().min(20).max(300),
});

function sanitize(text: string): string {
  return forbiddenWords.reduce((acc, forbidden) => {
    const regex = new RegExp(`\\b${forbidden}\\b`, "gi");
    return acc.replace(regex, "metodo");
  }, text);
}

function fallbackManifesto(input: ManifestoInput): ManifestoOutput {
  const essencia = input.structured_onboarding.essencia;
  const posicionamento = input.structured_onboarding.posicionamento;
  const publico = input.structured_onboarding.publico;
  const prova = input.structured_onboarding.prova;
  const personalidade = input.structured_onboarding.personalidade;
  const futuro = input.structured_onboarding.futuro;

  const manifestoLong = sanitize(
    [
      `Nao existimos para prometer atalhos: existimos para construir clareza com responsabilidade clinica e comercial. ${essencia}`,
      `Nosso posicionamento rejeita generalidades e se ancora em diferenca observavel: ${posicionamento}`,
      `Falamos com pessoas reais e contextos reais: ${publico}`,
      `A prova vem de fatos verificaveis e repetiveis: ${prova}`,
      `A personalidade da marca combina firmeza e empatia, sem teatralidade vazia: ${personalidade}`,
      `Nossa tensao estrategica aponta para o proximo ciclo de crescimento com consistencia: ${futuro}`,
    ].join("\n\n"),
  );

  const manifestoShort = sanitize(
    "Clareza estrategica, prova concreta e comunicacao consistente para crescimento sustentavel.",
  );

  const positioningStatement = sanitize(
    "A GMV posiciona a clinica como referencia de decisao racional orientada por evidencias, nao por promessas vazias.",
  );

  return {
    manifesto_long: manifestoLong,
    manifesto_short: manifestoShort,
    positioning_statement: positioningStatement,
  };
}

export async function manifestoAgent(input: ManifestoInput): Promise<ManifestoOutput> {
  const llmOutput = await invokeStructuredLlm({
    schema: manifestoSchema,
    instructions: [
      "Voce escreve manifesto estrategico em pt-BR para clinicas.",
      "Seja firme, concreto e sem promessas absolutas.",
      "Nao use as palavras proibidas: segredo, hack, formula.",
      "Entregue conteudo acionavel e conectado ao onboarding.",
    ].join(" "),
    context: JSON.stringify(input.structured_onboarding, null, 2),
  });

  if (llmOutput) {
    return {
      manifesto_long: sanitize(llmOutput.manifesto_long),
      manifesto_short: sanitize(llmOutput.manifesto_short),
      positioning_statement: sanitize(llmOutput.positioning_statement),
    };
  }

  return fallbackManifesto(input);
}
