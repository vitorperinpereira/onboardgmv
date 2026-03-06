import { z } from "zod";

export const onboardingSteps = [
  "essencia",
  "posicionamento",
  "publico",
  "prova",
  "personalidade",
  "futuro",
] as const;

export type OnboardingStep = (typeof onboardingSteps)[number];
export type SessionStatus = "in_progress" | "completed";
export type MessageRole = "user" | "assistant" | "system";

export const SPECIFICITY_THRESHOLD = 7;

export const createSessionSchema = z.object({
  client_name: z.string().min(2).max(120),
  clinic_name: z.string().min(2).max(160),
  email: z.email(),
});

export const submitAnswerSchema = z.object({
  token: z.string().uuid(),
  step: z.enum(onboardingSteps),
  answers: z.object({
    response: z.string().min(3).max(6000),
  }),
});

export const generateDocumentsSchema = z.object({
  session_id: z.string().uuid(),
  regenerate: z.boolean().optional(),
});

export const reviewContentSchema = z.object({
  session_id: z.string().uuid(),
  content_submitted: z.string().min(10).max(25000),
});

export const createCopySchema = z.object({
  session_id: z.string().uuid(),
  objective: z.string().min(3).max(300),
  format: z.string().min(2).max(80),
  constraints: z.array(z.string().min(1).max(220)).max(12).optional().default([]),
});

export type ClientRecord = {
  id: string;
  name: string;
  clinic_name: string;
  email: string;
  created_at: string;
};

export type OnboardingSessionRecord = {
  id: string;
  client_id: string;
  token: string;
  status: SessionStatus;
  maturity_score: number | null;
  created_at: string;
  completed_at: string | null;
};

export type OnboardingResponseRecord = {
  id: string;
  session_id: string;
  step: OnboardingStep;
  answers: Record<string, unknown>;
  specificity_score: number;
  is_partial: boolean;
  created_at: string;
};

export type OnboardingMessageRecord = {
  id: string;
  session_id: string;
  step: OnboardingStep;
  role: MessageRole;
  content: string;
  created_at: string;
};

export type StrategicDocumentRecord = {
  id: string;
  session_id: string;
  manifesto: string;
  manifesto_short: string;
  editorial_guide: Record<string, unknown>;
  frameworks: Record<string, unknown>;
  internal_diagnosis: Record<string, unknown>;
  created_at: string;
};

export type ContentReviewRecord = {
  id: string;
  session_id: string;
  content_submitted: string;
  alignment_score: number;
  strengths: string[];
  misalignments: string[];
  justification: string;
  suggestions: string[];
  created_at: string;
};

export type CopyGenerationRecord = {
  id: string;
  session_id: string;
  objective: string;
  format: string;
  constraints: string[];
  copy_variants: string[];
  rationale: string;
  created_at: string;
};
