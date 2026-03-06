import { OnboardingStep } from "@/types/domain";

export type EvaluateSpecificityInput = {
  step: OnboardingStep;
  current_answer: string;
  step_history: string[];
};

export type EvaluateSpecificityOutput = {
  is_generic: boolean;
  specificity_score: number;
  followups: string[];
  why_generic: string[];
};

export type ManifestoInput = {
  structured_onboarding: Record<OnboardingStep, string>;
};

export type ManifestoOutput = {
  manifesto_long: string;
  manifesto_short: string;
  positioning_statement: string;
};

export type EditorialGuideInput = {
  manifesto: ManifestoOutput;
  onboarding_context: Record<OnboardingStep, string>;
};

export type EditorialGuideOutput = {
  voice: string;
  tone: string;
  rational_vs_emotional: string;
  pillars: string[];
  what_we_combat: string[];
  forbidden_words: string[];
  cta_rules: string[];
  content_structure_pattern: string;
};

export type AlignmentReviewInput = {
  session_context: Record<string, unknown>;
  content_submitted: string;
};

export type AlignmentReviewOutput = {
  alignment_score: number;
  strengths: string[];
  misalignments: string[];
  justification: string;
  suggestions: string[];
};

export type CopyCreationInput = {
  manifesto: ManifestoOutput;
  editorial_guide: EditorialGuideOutput;
  frameworks: Record<string, unknown>;
  objective: string;
  format: string;
  constraints: string[];
};

export type CopyCreationOutput = {
  copy_variants: string[];
  rationale: string;
};
