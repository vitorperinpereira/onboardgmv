import { EditorialGuideInput, EditorialGuideOutput } from "@/agents/contracts";
import { invokeStructuredLlm } from "@/services/llmProvider";
import { z } from "zod";

const editorialGuideSchema = z.object({
  voice: z.string().min(10),
  tone: z.string().min(10),
  rational_vs_emotional: z.string().min(3),
  pillars: z.array(z.string().min(5)).min(3).max(6),
  what_we_combat: z.array(z.string().min(5)).min(3).max(6),
  forbidden_words: z.array(z.string().min(2)).min(4).max(12),
  cta_rules: z.array(z.string().min(5)).min(3).max(6),
  content_structure_pattern: z.string().min(20),
});

function fallbackGuide(input: EditorialGuideInput): EditorialGuideOutput {
  const manifesto = input.manifesto.manifesto_short;

  return {
    voice: "Especialista estrategico que traduz complexidade em orientacao objetiva.",
    tone: "Assertivo, claro e respeitoso; evita hype e promessas absolutas.",
    rational_vs_emotional: "70/30 com predominancia racional.",
    pillars: [
      "Diagnostico antes de promessa",
      "Evidencia antes de opiniao",
      "Consistencia antes de volume",
      "Educacao do mercado com criterio",
    ],
    what_we_combat: [
      "Promessas milagrosas sem lastro",
      "Linguagem de urgencia manipulativa",
      "Narrativas sem contexto ou causalidade",
    ],
    forbidden_words: ["segredo", "hack", "formula", "garantia total", "resultado instantaneo"],
    cta_rules: [
      "Convite para diagnostico estrategico com contexto",
      "Evitar CTA agressivo de escassez artificial",
      "Fechar com proximo passo objetivo (ex.: avaliacao inicial)",
    ],
    content_structure_pattern:
      "Contexto -> Tese -> Evidencia -> Implicacao pratica -> Proximo passo. Base: " + manifesto,
  };
}

function normalizeGuide(output: z.infer<typeof editorialGuideSchema>): EditorialGuideOutput {
  const forbidden = Array.from(new Set(output.forbidden_words.map((item) => item.trim().toLowerCase())))
    .filter(Boolean);

  for (const baseline of ["segredo", "hack", "formula"]) {
    if (!forbidden.includes(baseline)) {
      forbidden.push(baseline);
    }
  }

  return {
    voice: output.voice.trim(),
    tone: output.tone.trim(),
    rational_vs_emotional: output.rational_vs_emotional.trim(),
    pillars: output.pillars.map((item) => item.trim()),
    what_we_combat: output.what_we_combat.map((item) => item.trim()),
    forbidden_words: forbidden,
    cta_rules: output.cta_rules.map((item) => item.trim()),
    content_structure_pattern: output.content_structure_pattern.trim(),
  };
}

export async function editorialGuideAgent(
  input: EditorialGuideInput,
): Promise<EditorialGuideOutput> {
  const llmOutput = await invokeStructuredLlm({
    schema: editorialGuideSchema,
    instructions: [
      "Voce gera guia editorial estrategico em pt-BR.",
      "Tome o manifesto e onboarding como fonte de verdade.",
      "Evite jargao vazio e nao use promessas absolutas.",
      "Inclua palavras proibidas para proteger o posicionamento.",
    ].join(" "),
    context: JSON.stringify(
      {
        manifesto: input.manifesto,
        onboarding_context: input.onboarding_context,
      },
      null,
      2,
    ),
  });

  if (llmOutput) {
    return normalizeGuide(llmOutput);
  }

  return fallbackGuide(input);
}
