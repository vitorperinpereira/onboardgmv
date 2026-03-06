"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  fetchAdminSessions,
  loadEditorialContext,
  persistAdminToken,
  persistSessionId,
  SessionBundle,
} from "@/lib/frontendContext";

type StrategicDocument = {
  session_id: string;
  manifesto_short: string;
  editorial_guide: Record<string, unknown>;
  frameworks: Record<string, unknown>;
  created_at: string;
};

function asList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return [value];
  }
  return [];
}

function asText(value: unknown, fallback = "N/D") {
  if (typeof value === "string" && value.trim()) {
    return value;
  }
  return fallback;
}

export default function BrandBiblePage() {
  const [adminToken, setAdminToken] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [sessions, setSessions] = useState<SessionBundle[]>([]);
  const [document, setDocument] = useState<StrategicDocument | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [feedback, setFeedback] = useState("");

  const guide = (document?.editorial_guide ?? {}) as Record<string, unknown>;

  const pillars = useMemo(() => asList(guide.pillars), [guide.pillars]);
  const forbiddenWords = useMemo(() => asList(guide.forbidden_words), [guide.forbidden_words]);
  const combat = useMemo(() => asList(guide.what_we_combat), [guide.what_we_combat]);
  const ctaRules = useMemo(() => asList(guide.cta_rules), [guide.cta_rules]);
  const structure = asText(guide.content_structure_pattern);

  const fetchDocument = async ({
    tokenOverride,
    sessionOverride,
    silent,
  }: {
    tokenOverride?: string;
    sessionOverride?: string;
    silent?: boolean;
  } = {}) => {
    const token = (tokenOverride ?? adminToken).trim();
    const resolvedSessionId = (sessionOverride ?? sessionId).trim();

    if (!resolvedSessionId || !token) {
      if (!silent) {
        setFeedback("Informe sessao e token admin para carregar o guia de marca.");
      }
      return;
    }

    setIsLoading(true);
    if (!silent) {
      setFeedback("");
    }

    try {
      const response = await fetch(`/api/documents/${resolvedSessionId}`, {
        headers: {
          "x-admin-token": token,
        },
      });
      const body = (await response.json().catch(() => null)) as
        | {
            details?: string;
          }
        | StrategicDocument
        | null;

      if (!response.ok) {
        const details = body && "details" in body
          ? body.details ?? "Falha ao carregar guia de marca."
          : "Falha ao carregar guia de marca.";
        setFeedback(details);
        setDocument(null);
        return;
      }

      setDocument(body as StrategicDocument);
    } catch (cause) {
      if (!silent) {
        setFeedback(cause instanceof Error ? cause.message : "Erro ao carregar guia de marca.");
      }
      setDocument(null);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSessionOptions = async (tokenOverride?: string, preferredSessionId?: string, silent?: boolean) => {
    const token = (tokenOverride ?? adminToken).trim();
    if (!token) {
      return;
    }

    setIsLoadingSessions(true);

    try {
      const result = await fetchAdminSessions(token);
      if (!result.ok) {
        if (!silent) {
          setFeedback(result.details);
        }
        return;
      }

      setSessions(result.sessions);
      if (result.sessions.length === 0) {
        return;
      }

      const preferred = preferredSessionId ?? sessionId;
      const nextSessionId = result.sessions.some((item) => item.session.id === preferred)
        ? preferred
        : result.sessions[0]!.session.id;

      if (nextSessionId && nextSessionId !== sessionId) {
        setSessionId(nextSessionId);
        persistSessionId(nextSessionId);
      }
    } catch (cause) {
      if (!silent) {
        setFeedback(cause instanceof Error ? cause.message : "Erro ao carregar sessoes.");
      }
    } finally {
      setIsLoadingSessions(false);
    }
  };

  useEffect(() => {
    const context = loadEditorialContext();
    setAdminToken(context.adminToken);
    setSessionId(context.sessionId);

    if (!context.adminToken) {
      return;
    }

    void loadSessionOptions(context.adminToken, context.sessionId, true);
    if (context.sessionId) {
      void fetchDocument({
        tokenOverride: context.adminToken,
        sessionOverride: context.sessionId,
        silent: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (sessionId && adminToken) {
      persistSessionId(sessionId);
      void fetchDocument({
        silent: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, adminToken]);

  const persist = () => {
    persistAdminToken(adminToken);
    if (sessionId.trim()) {
      persistSessionId(sessionId);
    }

    if (adminToken.trim()) {
      void loadSessionOptions(adminToken.trim(), sessionId.trim(), true);
    }

    setFeedback("Contexto salvo.");
  };

  const sessionQuery = sessionId ? `?session=${sessionId}` : "";

  return (
    <div className="ec-shell ec-brand-shell">
      <header className="ec-topbar">
        <div className="ec-brand">
          <span className="ec-brand-icon">auto_stories</span>
          <h1>Guia de marca</h1>
        </div>
        <div className="ec-topbar-actions">
          <Link href="/">Biblioteca</Link>
          <Link href={`/manifesto${sessionQuery}`}>Manifesto</Link>
          <Link href={`/alignment-editor${sessionQuery}`}>Editor de alinhamento</Link>
        </div>
      </header>

      <main className="ec-main">
        <section className="ec-control-card">
          <div className="ec-control-grid">
            <select value={sessionId} onChange={(event) => setSessionId(event.target.value)} disabled={isLoadingSessions}>
              <option value="">Selecione a sessao</option>
              {sessions.map((item) => (
              <option key={item.session.id} value={item.session.id}>
                  {item.client.clinic_name} ({item.session.status === "completed" ? "concluida" : "em andamento"})
                </option>
              ))}
            </select>
            <input value={sessionId} onChange={(event) => setSessionId(event.target.value)} placeholder="session_id" />
            <input
              value={adminToken}
              onChange={(event) => setAdminToken(event.target.value)}
              placeholder="x-admin-token"
            />
            <button type="button" onClick={persist}>
              Salvar contexto
            </button>
            <button
              type="button"
              onClick={() => {
                void fetchDocument();
              }}
              disabled={isLoading}
            >
              {isLoading ? "Atualizando..." : "Atualizar"}
            </button>
            <button
              type="button"
              onClick={() => {
                void loadSessionOptions();
              }}
              disabled={isLoadingSessions}
            >
              {isLoadingSessions ? "Carregando..." : "Atualizar sessoes"}
            </button>
          </div>
          {feedback ? <p className="ec-feedback">{feedback}</p> : null}
        </section>

        {sessionId && document ? (
          <section className="ec-brand-grid">
            <article className="ec-brand-card">
              <h3>Pilares centrais</h3>
              {pillars.length > 0 ? (
                <ul>
                  {pillars.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="ec-muted">Sem pilares cadastrados no documento.</p>
              )}
            </article>

            <article className="ec-brand-card">
              <h3>Tom de voz</h3>
              <p>
                <strong>Voz:</strong> {asText(guide.voice)}
              </p>
              <p>
                <strong>Tom:</strong> {asText(guide.tone)}
              </p>
              <p>
                <strong>Racional vs emocional:</strong> {asText(guide.rational_vs_emotional)}
              </p>
            </article>

            <article className="ec-brand-card">
              <h3>Lista de bloqueio</h3>
              {forbiddenWords.length > 0 ? (
                <div className="ec-tag-row">
                  {forbiddenWords.map((item) => (
                    <span key={item} className="ec-tag ec-tag-danger">
                      {item}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="ec-muted">Sem palavras proibidas registradas.</p>
              )}
            </article>

            <article className="ec-brand-card">
              <h3>O que combatemos</h3>
              {combat.length > 0 ? (
                <ul>
                  {combat.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="ec-muted">Sem itens registrados.</p>
              )}
            </article>

            <article className="ec-brand-card">
              <h3>Regras de CTA</h3>
              {ctaRules.length > 0 ? (
                <ul>
                  {ctaRules.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="ec-muted">Sem regras de CTA registradas.</p>
              )}
            </article>

            <article className="ec-brand-card">
              <h3>Estrutura de conteudo</h3>
              <p>{structure}</p>
              <p className="ec-muted">{document.manifesto_short}</p>
            </article>
          </section>
        ) : (
          <section className="ec-empty-card">
            <h3>{sessionId ? "Nenhum guia de marca carregado" : "Selecione uma sessao"}</h3>
            <p className="ec-muted">
              {sessionId
                ? "Carregue um documento estrategico pelo session_id para visualizar as diretrizes."
                : "Use Atualizar sessoes para selecionar um onboarding concluido."}
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
