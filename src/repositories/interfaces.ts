import {
  ClientRecord,
  ContentReviewRecord,
  CopyGenerationRecord,
  MessageRole,
  OnboardingMessageRecord,
  OnboardingResponseRecord,
  OnboardingSessionRecord,
  OnboardingStep,
  StrategicDocumentRecord,
} from "@/types/domain";

export type SessionBundle = {
  session: OnboardingSessionRecord;
  client: ClientRecord;
};

export type SessionContext = SessionBundle & {
  responses: OnboardingResponseRecord[];
  messages: OnboardingMessageRecord[];
  strategicDocument: StrategicDocumentRecord | null;
};

export interface OnboardingRepository {
  createSession(input: {
    client_name: string;
    clinic_name: string;
    email: string;
    token: string;
  }): Promise<SessionBundle>;
  listSessions(): Promise<SessionBundle[]>;
  getSessionByToken(token: string): Promise<SessionBundle | null>;
  getSessionById(sessionId: string): Promise<SessionBundle | null>;
  getSessionContext(sessionId: string): Promise<SessionContext | null>;
  listResponsesBySession(sessionId: string): Promise<OnboardingResponseRecord[]>;
  upsertResponse(input: {
    session_id: string;
    step: OnboardingStep;
    answers: Record<string, unknown>;
    specificity_score: number;
    is_partial: boolean;
  }): Promise<OnboardingResponseRecord>;
  addMessage(input: {
    session_id: string;
    step: OnboardingStep;
    role: MessageRole;
    content: string;
  }): Promise<OnboardingMessageRecord>;
  completeSession(sessionId: string, maturityScore: number): Promise<void>;
  saveStrategicDocument(input: {
    session_id: string;
    manifesto: string;
    manifesto_short: string;
    editorial_guide: Record<string, unknown>;
    frameworks: Record<string, unknown>;
    internal_diagnosis: Record<string, unknown>;
  }): Promise<StrategicDocumentRecord>;
  getStrategicDocument(sessionId: string): Promise<StrategicDocumentRecord | null>;
  saveContentReview(input: {
    session_id: string;
    content_submitted: string;
    alignment_score: number;
    strengths: string[];
    misalignments: string[];
    justification: string;
    suggestions: string[];
  }): Promise<ContentReviewRecord>;
  saveCopyGeneration(input: {
    session_id: string;
    objective: string;
    format: string;
    constraints: string[];
    copy_variants: string[];
    rationale: string;
  }): Promise<CopyGenerationRecord>;
}
