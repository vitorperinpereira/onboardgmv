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
  id: string;
  session_id: string;
  manifesto: string;
  manifesto_short: string;
  editorial_guide: Record<string, unknown>;
  frameworks: Record<string, unknown>;
  internal_diagnosis: Record<string, unknown>;
  created_at: string;
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function prettyDate(value: string) {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function ManifestoPage() {
  const [adminToken, setAdminToken] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [sessions, setSessions] = useState<SessionBundle[]>([]);
  const [document, setDocument] = useState<StrategicDocument | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [forceRegenerate, setForceRegenerate] = useState(false);
  const [feedback, setFeedback] = useState("");

  const paragraphs = useMemo(() => {
    if (!document?.manifesto) {
      return [];
    }
    return document.manifesto.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
  }, [document?.manifesto]);

  const fetchDocuments = async ({
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
        setFeedback("Informe sessao e token admin para carregar manifesto.");
      }
      return false;
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

      if (response.status === 404) {
        setDocument(null);
        if (!silent) {
          setFeedback("Documento ainda nao gerado para essa sessao.");
        }
        return false;
      }

      if (!response.ok) {
        const details = body && "details" in body ? body.details ?? "Falha ao buscar manifesto." : "Falha ao buscar manifesto.";
        setFeedback(details);
        return false;
      }

      setDocument(body as StrategicDocument);
      return true;
    } catch (cause) {
      if (!silent) {
        setFeedback(cause instanceof Error ? cause.message : "Erro ao carregar manifesto.");
      }
      return false;
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
      void fetchDocuments({
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
      void fetchDocuments({
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
    setFeedback("Contexto salvo localmente.");
  };

  const generateManifesto = async () => {
    if (!sessionId.trim() || !adminToken.trim()) {
      setFeedback("Informe sessao e token admin.");
      return;
    }

    setIsGenerating(true);
    setFeedback("");

    try {
      const response = await fetch("/api/documents/generate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-token": adminToken.trim(),
        },
        body: JSON.stringify({ session_id: sessionId.trim(), regenerate: forceRegenerate }),
      });
      const body = (await response.json().catch(() => null)) as
        | {
            details?: string;
            status?: string;
          }
        | null;

      if (!response.ok) {
        setFeedback(body?.details ?? "Falha ao gerar documento.");
        return;
      }

      const statusText = body?.status === "completed_sync" ? "concluida" : "em fila";
      setFeedback(`Geracao iniciada (${statusText}). Aguardando consolidacao...`);
      for (let i = 0; i < 6; i += 1) {
        await delay(1200);
        const found = await fetchDocuments({ silent: true });
        if (found || i === 5) {
          break;
        }
      }
    } catch (cause) {
      setFeedback(cause instanceof Error ? cause.message : "Erro ao gerar manifesto.");
    } finally {
      setIsGenerating(false);
    }
  };

  const sessionQuery = sessionId ? `?session=${sessionId}` : "";

  return (
    <div className="ec-shell ec-manifesto-shell">
      <header className="ec-topbar">
        <div className="ec-brand">
          <span className="ec-brand-icon">description</span>
          <h1>Manifesto</h1>
        </div>
        <div className="ec-topbar-actions">
          <Link href="/">Biblioteca</Link>
          <Link href={`/brand-bible${sessionQuery}`}>Guia de marca</Link>
          <Link href={`/alignment-editor${sessionQuery}`}>Editor de alinhamento</Link>
        </div>
      </header>

      <main className="ec-main ec-manifesto-main">
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
                void fetchDocuments();
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
            <button type="button" onClick={generateManifesto} disabled={isGenerating}>
              {isGenerating ? "Gerando..." : "Gerar manifesto"}
            </button>
          </div>
          <label className="ec-checkline">
            <input
              type="checkbox"
              checked={forceRegenerate}
              onChange={(event) => setForceRegenerate(event.target.checked)}
            />
            Reprocessar documento
          </label>
          {feedback ? <p className="ec-feedback">{feedback}</p> : null}
        </section>

        {sessionId && document ? (
          <section className="ec-manifesto-paper">
            <header>
              <p className="ec-overline">Compendio estrategico</p>
              <h2>Diretriz principal</h2>
              <p className="ec-muted">Atualizado em {prettyDate(document.created_at)}</p>
            </header>

            <article>
              {paragraphs.length > 0 ? paragraphs.map((paragraph) => <p key={paragraph.slice(0, 32)}>{paragraph}</p>) : null}
            </article>

            <footer>
              <div>
                <p className="ec-overline">Manifesto curto</p>
                <p>{document.manifesto_short}</p>
              </div>
              <div>
                <p className="ec-overline">Frameworks</p>
                <pre>{JSON.stringify(document.frameworks, null, 2)}</pre>
              </div>
            </footer>
          </section>
        ) : (
          <section className="ec-empty-card">
            <h3>{sessionId ? "Nenhum manifesto carregado" : "Selecione uma sessao"}</h3>
            <p className="ec-muted">
              {sessionId
                ? "Se a sessao estiver concluida, use Gerar manifesto. Se ja existir, use Atualizar."
                : "Use Atualizar sessoes para escolher um onboarding antes de consultar documentos."}
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
