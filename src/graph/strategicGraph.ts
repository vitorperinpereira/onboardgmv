import { Annotation, StateGraph } from "@langchain/langgraph";
import { editorialGuideAgent } from "@/agents/editorialGuideAgent";
import { manifestoAgent } from "@/agents/manifestoAgent";
import { ManifestoOutput, EditorialGuideOutput } from "@/agents/contracts";
import { OnboardingStep } from "@/types/domain";

const StrategicAnnotation = Annotation.Root({
  onboarding: Annotation<Record<OnboardingStep, string>>({
    reducer: (_, update) => update,
  }),
  manifesto: Annotation<ManifestoOutput | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),
  editorialGuide: Annotation<EditorialGuideOutput | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),
  frameworks: Annotation<Record<string, unknown> | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),
  internalDiagnosis: Annotation<Record<string, unknown> | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),
});

const graph = new StateGraph(StrategicAnnotation)
  .addNode("ManifestoAgent", async (state) => {
    const manifesto = await manifestoAgent({
      structured_onboarding: state.onboarding,
    });

    return { manifesto };
  })
  .addNode("EditorialGuideAgent", async (state) => {
    if (!state.manifesto) {
      throw new Error("Manifesto nao encontrado para gerar guia editorial.");
    }

    const editorialGuide = await editorialGuideAgent({
      manifesto: state.manifesto,
      onboarding_context: state.onboarding,
    });

    return { editorialGuide };
  })
  .addNode("FrameworkBuilder", async (state) => {
    if (!state.editorialGuide) {
      throw new Error("Guia editorial nao encontrado para gerar frameworks.");
    }

    const frameworks = {
      narrative_framework: [
        "Contexto claro",
        "Conflito estrategico",
        "Evidencia concreta",
        "Direcao de acao",
      ],
      proof_framework: ["Premissa", "Dados", "Exemplo", "Conclusao"],
      cta_framework: state.editorialGuide.cta_rules,
    };

    const internalDiagnosis = {
      readiness_level: "medium",
      main_gap: "Padronizacao de narrativa por canal",
      recommended_focus_30_days: [
        "Aplicar pilares editoriais em 100% dos conteudos",
        "Reforcar evidencias em assets de topo e meio de funil",
        "Remover linguagem vaga nas copys de conversao",
      ],
    };

    return { frameworks, internalDiagnosis };
  })
  .addEdge("__start__", "ManifestoAgent")
  .addEdge("ManifestoAgent", "EditorialGuideAgent")
  .addEdge("EditorialGuideAgent", "FrameworkBuilder")
  .addEdge("FrameworkBuilder", "__end__")
  .compile();

export async function runStrategicGraph(onboarding: Record<OnboardingStep, string>) {
  const result = await graph.invoke({
    onboarding,
    manifesto: null,
    editorialGuide: null,
    frameworks: null,
    internalDiagnosis: null,
  });

  if (!result.manifesto || !result.editorialGuide || !result.frameworks || !result.internalDiagnosis) {
    throw new Error("Falha na composicao do grafo estrategico.");
  }

  return {
    manifesto: result.manifesto,
    editorialGuide: result.editorialGuide,
    frameworks: result.frameworks,
    internalDiagnosis: result.internalDiagnosis,
  };
}
