import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { OnboardingRepository, SessionBundle, SessionContext } from "@/repositories/interfaces";
import {
  ClientRecord,
  ContentReviewRecord,
  CopyGenerationRecord,
  OnboardingMessageRecord,
  OnboardingResponseRecord,
  OnboardingSessionRecord,
  StrategicDocumentRecord,
} from "@/types/domain";

export class SupabaseOnboardingRepository implements OnboardingRepository {
  private client = createClient(env.supabaseUrl!, env.supabaseServiceRoleKey!, {
    auth: { persistSession: false },
  });

  async createSession(input: {
    client_name: string;
    clinic_name: string;
    email: string;
    token: string;
  }): Promise<SessionBundle> {
    const clientInsert = await this.client
      .from("clients")
      .insert({
        name: input.client_name,
        clinic_name: input.clinic_name,
        email: input.email,
      })
      .select("*")
      .single();

    if (clientInsert.error) {
      throw clientInsert.error;
    }

    const sessionInsert = await this.client
      .from("onboarding_sessions")
      .insert({
        client_id: clientInsert.data.id,
        token: input.token,
        status: "in_progress",
      })
      .select("*")
      .single();

    if (sessionInsert.error) {
      throw sessionInsert.error;
    }

    return {
      client: clientInsert.data as ClientRecord,
      session: sessionInsert.data as OnboardingSessionRecord,
    };
  }

  async listSessions(): Promise<SessionBundle[]> {
    const sessionsResult = await this.client
      .from("onboarding_sessions")
      .select("*")
      .order("created_at", { ascending: false });

    if (sessionsResult.error) {
      throw sessionsResult.error;
    }

    if (!sessionsResult.data || sessionsResult.data.length === 0) {
      return [];
    }

    const clientIds = [...new Set(sessionsResult.data.map((session) => session.client_id))];
    const clientsResult = await this.client.from("clients").select("*").in("id", clientIds);

    if (clientsResult.error) {
      throw clientsResult.error;
    }

    const clientMap = new Map<string, ClientRecord>(
      (clientsResult.data as ClientRecord[]).map((client) => [client.id, client]),
    );

    return (sessionsResult.data as OnboardingSessionRecord[])
      .map((session) => {
        const client = clientMap.get(session.client_id);
        if (!client) {
          return null;
        }
        return { session, client };
      })
      .filter((item): item is SessionBundle => Boolean(item));
  }

  async getSessionByToken(token: string): Promise<SessionBundle | null> {
    const sessionResult = await this.client
      .from("onboarding_sessions")
      .select("*")
      .eq("token", token)
      .single();

    if (sessionResult.error) {
      if (sessionResult.error.code === "PGRST116") {
        return null;
      }
      throw sessionResult.error;
    }

    const clientResult = await this.client
      .from("clients")
      .select("*")
      .eq("id", sessionResult.data.client_id)
      .single();

    if (clientResult.error) {
      throw clientResult.error;
    }

    return {
      session: sessionResult.data as OnboardingSessionRecord,
      client: clientResult.data as ClientRecord,
    };
  }

  async getSessionById(sessionId: string): Promise<SessionBundle | null> {
    const sessionResult = await this.client
      .from("onboarding_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sessionResult.error) {
      if (sessionResult.error.code === "PGRST116") {
        return null;
      }
      throw sessionResult.error;
    }

    const clientResult = await this.client
      .from("clients")
      .select("*")
      .eq("id", sessionResult.data.client_id)
      .single();

    if (clientResult.error) {
      throw clientResult.error;
    }

    return {
      session: sessionResult.data as OnboardingSessionRecord,
      client: clientResult.data as ClientRecord,
    };
  }

  async getSessionContext(sessionId: string): Promise<SessionContext | null> {
    const bundle = await this.getSessionById(sessionId);
    if (!bundle) {
      return null;
    }

    return {
      ...bundle,
      responses: await this.listResponsesBySession(sessionId),
      messages: await this.listMessagesBySession(sessionId),
      strategicDocument: await this.getStrategicDocument(sessionId),
    };
  }

  private async listMessagesBySession(sessionId: string): Promise<OnboardingMessageRecord[]> {
    const result = await this.client
      .from("onboarding_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (result.error) {
      throw result.error;
    }

    return result.data as OnboardingMessageRecord[];
  }

  async listResponsesBySession(sessionId: string): Promise<OnboardingResponseRecord[]> {
    const result = await this.client
      .from("onboarding_responses")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (result.error) {
      throw result.error;
    }

    return result.data as OnboardingResponseRecord[];
  }

  async upsertResponse(input: {
    session_id: string;
    step: OnboardingResponseRecord["step"];
    answers: Record<string, unknown>;
    specificity_score: number;
    is_partial: boolean;
  }): Promise<OnboardingResponseRecord> {
    const result = await this.client
      .from("onboarding_responses")
      .insert({
        session_id: input.session_id,
        step: input.step,
        answers: input.answers,
        specificity_score: input.specificity_score,
        is_partial: input.is_partial,
      })
      .select("*")
      .single();

    if (result.error) {
      throw result.error;
    }

    return result.data as OnboardingResponseRecord;
  }

  async addMessage(input: {
    session_id: string;
    step: OnboardingMessageRecord["step"];
    role: OnboardingMessageRecord["role"];
    content: string;
  }): Promise<OnboardingMessageRecord> {
    const result = await this.client
      .from("onboarding_messages")
      .insert({
        session_id: input.session_id,
        step: input.step,
        role: input.role,
        content: input.content,
      })
      .select("*")
      .single();

    if (result.error) {
      throw result.error;
    }

    return result.data as OnboardingMessageRecord;
  }

  async completeSession(sessionId: string, maturityScore: number): Promise<void> {
    const result = await this.client
      .from("onboarding_sessions")
      .update({
        status: "completed",
        maturity_score: maturityScore,
        completed_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (result.error) {
      throw result.error;
    }
  }

  async saveStrategicDocument(input: {
    session_id: string;
    manifesto: string;
    manifesto_short: string;
    editorial_guide: Record<string, unknown>;
    frameworks: Record<string, unknown>;
    internal_diagnosis: Record<string, unknown>;
  }): Promise<StrategicDocumentRecord> {
    const result = await this.client
      .from("strategic_documents")
      .upsert(
        {
          session_id: input.session_id,
          manifesto: input.manifesto,
          manifesto_short: input.manifesto_short,
          editorial_guide: input.editorial_guide,
          frameworks: input.frameworks,
          internal_diagnosis: input.internal_diagnosis,
        },
        {
          onConflict: "session_id",
        },
      )
      .select("*")
      .single();

    if (result.error) {
      throw result.error;
    }

    return result.data as StrategicDocumentRecord;
  }

  async getStrategicDocument(sessionId: string): Promise<StrategicDocumentRecord | null> {
    const result = await this.client
      .from("strategic_documents")
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (result.error) {
      throw result.error;
    }

    return (result.data as StrategicDocumentRecord | null) ?? null;
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
    const result = await this.client
      .from("content_reviews")
      .insert({
        session_id: input.session_id,
        content_submitted: input.content_submitted,
        alignment_score: input.alignment_score,
        strengths: input.strengths,
        misalignments: input.misalignments,
        justification: input.justification,
        suggestions: input.suggestions,
      })
      .select("*")
      .single();

    if (result.error) {
      throw result.error;
    }

    return result.data as ContentReviewRecord;
  }

  async saveCopyGeneration(input: {
    session_id: string;
    objective: string;
    format: string;
    constraints: string[];
    copy_variants: string[];
    rationale: string;
  }): Promise<CopyGenerationRecord> {
    const result = await this.client
      .from("copy_generations")
      .insert({
        session_id: input.session_id,
        objective: input.objective,
        format: input.format,
        constraints: input.constraints,
        copy_variants: input.copy_variants,
        rationale: input.rationale,
      })
      .select("*")
      .single();

    if (result.error) {
      throw result.error;
    }

    return result.data as CopyGenerationRecord;
  }
}
