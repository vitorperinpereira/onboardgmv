import { describe, expect, it } from "vitest";
import dataset from "../datasets/review-quality.json";
import { alignmentReviewAgent } from "@/agents/alignmentReviewAgent";

describe("alignment review quality dataset", () => {
  it("scores aligned content above misaligned baseline", async () => {
    const context = {
      editorial_guide: {
        forbidden_words: ["segredo", "hack", "formula", "milagroso", "instantaneo"],
        content_structure_pattern: "Contexto -> Tese -> Evidencia -> Implicacao -> CTA",
      },
    };

    const alignedScores: number[] = [];
    for (const content of dataset.aligned) {
      const review = await alignmentReviewAgent({
        session_context: context,
        content_submitted: content,
      });
      alignedScores.push(review.alignment_score);
    }

    const misalignedScores: number[] = [];
    for (const content of dataset.misaligned) {
      const review = await alignmentReviewAgent({
        session_context: context,
        content_submitted: content,
      });
      misalignedScores.push(review.alignment_score);
    }

    const avg = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

    const alignedAverage = avg(alignedScores);
    const misalignedAverage = avg(misalignedScores);

    expect(alignedAverage).toBeGreaterThanOrEqual(7);
    expect(misalignedAverage).toBeLessThan(alignedAverage);
  });
});
