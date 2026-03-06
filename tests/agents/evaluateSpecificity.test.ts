import { describe, expect, it } from "vitest";
import { evaluateSpecificityAgent } from "@/agents/evaluateSpecificity";

describe("evaluateSpecificityAgent", () => {
  it("flags generic answer with low score", async () => {
    const output = await evaluateSpecificityAgent({
      step: "essencia",
      current_answer: "Somos diferenciados e entregamos excelencia para todos.",
      step_history: [],
    });

    expect(output.is_generic).toBe(true);
    expect(output.specificity_score).toBeLessThan(7);
    expect(output.followups.length).toBeGreaterThan(0);
  });

  it("accepts specific answer with enough evidence", async () => {
    const output = await evaluateSpecificityAgent({
      step: "prova",
      current_answer:
        "Nos ultimos 6 meses, por exemplo, atendemos 137 pacientes de reconstrucao capilar com taxa de retorno de 41% em 90 dias e NPS medio de 86.",
      step_history: [],
    });

    expect(output.is_generic).toBe(false);
    expect(output.specificity_score).toBeGreaterThanOrEqual(7);
  });
});
