import { newId, isoNow } from "@/lib/utils";
import {
  ClientRecord,
  ContentReviewRecord,
  CopyGenerationRecord,
  OnboardingMessageRecord,
  OnboardingResponseRecord,
  OnboardingSessionRecord,
  StrategicDocumentRecord,
} from "@/types/domain";
import { OnboardingRepository, SessionBundle, SessionContext } from "@/repositories/interfaces";

export class InMemoryOnboardingRepository implements OnboardingRepository {
  private clients = new Map<string, ClientRecord>();
  private sessions = new Map<string, OnboardingSessionRecord>();
  private responses = new Map<string, OnboardingResponseRecord[]>();
  private messages = new Map<string, OnboardingMessageRecord[]>();
  private strategicDocuments = new Map<string, StrategicDocumentRecord>();
  private contentReviews = new Map<string, ContentReviewRecord[]>();
  private copyGenerations = new Map<string, CopyGenerationRecord[]>();

  async createSession(input: {
    client_name: string;
    clinic_name: string;
    email: string;
    token: string;
  }): Promise<SessionBundle> {
    const client: ClientRecord = {
      id: newId(),
      name: input.client_name,
      clinic_name: input.clinic_name,
      email: input.email,
      created_at: isoNow(),
    };
    this.clients.set(client.id, client);

    const session: OnboardingSessionRecord = {
      id: newId(),
      client_id: client.id,
      token: input.token,
      status: "in_progress",
      maturity_score: null,
      created_at: isoNow(),
      completed_at: null,
    };
    this.sessions.set(session.id, session);
    this.responses.set(session.id, []);
    this.messages.set(session.id, []);

    return { client, session };
  }

  async listSessions(): Promise<SessionBundle[]> {
    return Array.from(this.sessions.values())
      .map((session) => {
        const client = this.clients.get(session.client_id);
        if (!client) {
          return null;
        }
        return { session, client } satisfies SessionBundle;
      })
      .filter((item): item is SessionBundle => Boolean(item));
  }

  async getSessionByToken(token: string): Promise<SessionBundle | null> {
    const session = Array.from(this.sessions.values()).find((s) => s.token === token);
    if (!session) {
      return null;
    }

    const client = this.clients.get(session.client_id);
    if (!client) {
      return null;
    }

    return { session, client };
  }

  async getSessionById(sessionId: string): Promise<SessionBundle | null> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    const client = this.clients.get(session.client_id);
    if (!client) {
      return null;
    }

    return { session, client };
  }

  async getSessionContext(sessionId: string): Promise<SessionContext | null> {
    const bundle = await this.getSessionById(sessionId);
    if (!bundle) {
      return null;
    }

    return {
      ...bundle,
      responses: await this.listResponsesBySession(sessionId),
      messages: [...(this.messages.get(sessionId) ?? [])],
      strategicDocument: await this.getStrategicDocument(sessionId),
    };
  }

  async listResponsesBySession(sessionId: string): Promise<OnboardingResponseRecord[]> {
    return [...(this.responses.get(sessionId) ?? [])].sort((a, b) =>
      a.created_at.localeCompare(b.created_at),
    );
  }

  async upsertResponse(input: {
    session_id: string;
    step: OnboardingResponseRecord["step"];
    answers: Record<string, unknown>;
    specificity_score: number;
    is_partial: boolean;
  }): Promise<OnboardingResponseRecord> {
    const list = this.responses.get(input.session_id) ?? [];

    const record: OnboardingResponseRecord = {
      id: newId(),
      session_id: input.session_id,
      step: input.step,
      answers: input.answers,
      specificity_score: input.specificity_score,
      is_partial: input.is_partial,
      created_at: isoNow(),
    };

    list.push(record);
    this.responses.set(input.session_id, list);

    return record;
  }

  async addMessage(input: {
    session_id: string;
    step: OnboardingMessageRecord["step"];
    role: OnboardingMessageRecord["role"];
    content: string;
  }): Promise<OnboardingMessageRecord> {
    const list = this.messages.get(input.session_id) ?? [];

    const message: OnboardingMessageRecord = {
      id: newId(),
      session_id: input.session_id,
      step: input.step,
      role: input.role,
      content: input.content,
      created_at: isoNow(),
    };

    list.push(message);
    this.messages.set(input.session_id, list);

    return message;
  }

  async completeSession(sessionId: string, maturityScore: number): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }
    session.status = "completed";
    session.completed_at = isoNow();
    session.maturity_score = maturityScore;
    this.sessions.set(sessionId, session);
  }

  async saveStrategicDocument(input: {
    session_id: string;
    manifesto: string;
    manifesto_short: string;
    editorial_guide: Record<string, unknown>;
    frameworks: Record<string, unknown>;
    internal_diagnosis: Record<string, unknown>;
  }): Promise<StrategicDocumentRecord> {
    const doc: StrategicDocumentRecord = {
      id: newId(),
      session_id: input.session_id,
      manifesto: input.manifesto,
      manifesto_short: input.manifesto_short,
      editorial_guide: input.editorial_guide,
      frameworks: input.frameworks,
      internal_diagnosis: input.internal_diagnosis,
      created_at: isoNow(),
    };

    this.strategicDocuments.set(input.session_id, doc);
    return doc;
  }

  async getStrategicDocument(sessionId: string): Promise<StrategicDocumentRecord | null> {
    return this.strategicDocuments.get(sessionId) ?? null;
  }

  async saveContentReview(input: {
    session_id: string;
    content_submitted: string;
    alignment_score: number;
    strengths: string[];
    misalignments: string[];
    justification: string;
    suggestions: string[];
  }): Promise<ContentReviewRecord> {
    const review: ContentReviewRecord = {
      id: newId(),
      session_id: input.session_id,
      content_submitted: input.content_submitted,
      alignment_score: input.alignment_score,
      strengths: input.strengths,
      misalignments: input.misalignments,
      justification: input.justification,
      suggestions: input.suggestions,
      created_at: isoNow(),
    };

    const list = this.contentReviews.get(input.session_id) ?? [];
    list.push(review);
    this.contentReviews.set(input.session_id, list);
    return review;
  }

  async saveCopyGeneration(input: {
    session_id: string;
    objective: string;
    format: string;
    constraints: string[];
    copy_variants: string[];
    rationale: string;
  }): Promise<CopyGenerationRecord> {
    const generation: CopyGenerationRecord = {
      id: newId(),
      session_id: input.session_id,
      objective: input.objective,
      format: input.format,
      constraints: input.constraints,
      copy_variants: input.copy_variants,
      rationale: input.rationale,
      created_at: isoNow(),
    };

    const list = this.copyGenerations.get(input.session_id) ?? [];
    list.push(generation);
    this.copyGenerations.set(input.session_id, list);
    return generation;
  }
}
