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

type OperationalMetrics = {
  generated_at: string;
  sessions: {
    total: number;
    completed: number;
    in_progress: number;
    completion_rate: number;
  };
  queue: {
    configured: boolean;
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
  };
  api: {
    overall: {
      tracked_routes: number;
      total_requests: number;
      error_rate: number;
      p95_ms: number;
      p99_ms: number;
    };
  };
};

function formatDate(value: string) {
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

export default function LibraryPage() {
  const [adminToken, setAdminToken] = useState("");
  const [sessions, setSessions] = useState<SessionBundle[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [metrics, setMetrics] = useState<OperationalMetrics | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [feedback, setFeedback] = useState("");

  const selectedSession = useMemo(
    () => sessions.find((bundle) => bundle.session.id === selectedSessionId) ?? null,
    [sessions, selectedSessionId],
  );

  const loadSessions = async ({
    tokenOverride,
    preferredSessionId,
    silent,
  }: {
    tokenOverride?: string;
    preferredSessionId?: string;
    silent?: boolean;
  } = {}) => {
    const token = (tokenOverride ?? adminToken).trim();

    if (!token) {
      if (!silent) {
        setFeedback("Informe o token admin para carregar os compendios.");
      }
      return;
    }

    setIsLoadingSessions(true);
    setFeedback("");

    try {
      const result = await fetchAdminSessions(token);
      if (!result.ok) {
        setFeedback(result.details);
        return;
      }

      const items = result.sessions;
      setSessions(items);

      if (items.length === 0) {
        setFeedback("Nenhuma sessao encontrada. Crie uma nova entrevista.");
        return;
      }

      const resolvedSessionId = preferredSessionId ?? selectedSessionId;
      const nextSelection = items.some((item) => item.session.id === resolvedSessionId)
        ? resolvedSessionId
        : items[0]!.session.id;

      setSelectedSessionId(nextSelection);
      persistSessionId(nextSelection);
      setFeedback("Compendios carregados.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro ao buscar sessoes.");
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const loadMetrics = async (tokenOverride?: string, silent?: boolean) => {
    const token = (tokenOverride ?? adminToken).trim();

    if (!token) {
      if (!silent) {
        setFeedback("Informe o token admin para consultar metricas.");
      }
      return;
    }

    setIsLoadingMetrics(true);

    try {
      const response = await fetch("/api/admin/metrics", {
        headers: {
          "x-admin-token": token,
        },
      });
      const body = (await response.json().catch(() => null)) as
        | {
            details?: string;
          }
        | OperationalMetrics
        | null;

      if (!response.ok) {
        setFeedback(body && "details" in body ? body.details ?? "Falha ao carregar metricas." : "Falha ao carregar metricas.");
        return;
      }

      setMetrics(body as OperationalMetrics);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Erro ao buscar metricas.");
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  useEffect(() => {
    const context = loadEditorialContext();
    setAdminToken(context.adminToken);
    setSelectedSessionId(context.sessionId);

    if (!context.adminToken) {
      return;
    }

    void loadSessions({
      tokenOverride: context.adminToken,
      preferredSessionId: context.sessionId,
      silent: true,
    });
    void loadMetrics(context.adminToken, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistToken = () => {
    persistAdminToken(adminToken);
    setFeedback("Token admin salvo localmente.");

    if (adminToken.trim()) {
      void loadSessions({
        tokenOverride: adminToken.trim(),
        preferredSessionId: selectedSessionId,
        silent: true,
      });
      void loadMetrics(adminToken.trim(), true);
    }
  };

  const selectSession = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    persistSessionId(sessionId);
  };

  const sessionQuery = selectedSessionId ? `?session=${selectedSessionId}` : "";

  return (
    <div className="ec-shell">
      <header className="ec-topbar">
        <div className="ec-brand">
          <span className="ec-brand-icon">auto_stories</span>
          <h1>Editorial Canvas</h1>
        </div>
        <div className="ec-topbar-actions">
          <Link href="/interview" className="ec-text-link">
            Entrevista
          </Link>
          <Link href="/admin" className="ec-text-link">
            Painel
          </Link>
        </div>
      </header>

      <main className="ec-main ec-library">
        <section className="ec-library-head">
          <div>
            <p className="ec-overline">Biblioteca</p>
            <h2>Onboard GMV</h2>
            <p className="ec-muted">Selecione uma sessao para abrir os documentos estrategicos e o editor de alinhamento.</p>
          </div>
          <div className="ec-inline-form">
            <input
              value={adminToken}
              onChange={(event) => setAdminToken(event.target.value)}
              placeholder="x-admin-token"
            />
            <button type="button" onClick={persistToken}>
              Salvar token
            </button>
            <button
              type="button"
              onClick={() => {
                void loadSessions();
              }}
              disabled={isLoadingSessions}
            >
              {isLoadingSessions ? "Carregando..." : "Atualizar biblioteca"}
            </button>
            <button
              type="button"
              onClick={() => {
                void loadMetrics();
              }}
              disabled={isLoadingMetrics}
            >
              {isLoadingMetrics ? "Atualizando..." : "Atualizar painel"}
            </button>
          </div>
        </section>

        <section className="ec-library-grid">
          <Link href="/interview" className="ec-book-card ec-book-card-new">
            <div className="ec-card-pill">Novo</div>
            <h3>Novo compendio</h3>
            <p>Iniciar entrevista estrategica</p>
          </Link>

          {sessions.map((bundle) => {
            const isActive = selectedSessionId === bundle.session.id;
            return (
              <button
                type="button"
                key={bundle.session.id}
                onClick={() => selectSession(bundle.session.id)}
                className={`ec-book-card ${isActive ? "active" : ""}`}
              >
                <div className="ec-card-pill">{bundle.session.status === "completed" ? "Concluida" : "Em andamento"}</div>
                <h3>{bundle.client.clinic_name}</h3>
                <p>{bundle.client.name}</p>
                <span>{formatDate(bundle.session.created_at)}</span>
              </button>
            );
          })}
        </section>

        <section className="ec-route-panel">
          <div>
            <h3>Workspace da sessao</h3>
            <p className="ec-muted">
              {selectedSession
                ? `${selectedSession.client.clinic_name} (${selectedSession.session.id.slice(0, 8)}...)`
                : "Selecione um compendio na library"}
            </p>
          </div>
          <div className="ec-route-actions">
            <Link href={`/manifesto${sessionQuery}`}>Manifesto</Link>
            <Link href={`/brand-bible${sessionQuery}`}>Guia de marca</Link>
            <Link href={`/alignment-editor${sessionQuery}`}>Editor de alinhamento</Link>
          </div>
        </section>

        <section className="ec-metrics-panel">
          <div>
            <h3>Pulse Operacional</h3>
            <p className="ec-muted">
              {metrics?.generated_at
                ? `Atualizado em ${formatDate(metrics.generated_at)}`
                : "Carregue metricas para acompanhar operacao, fila e latencia da API."}
            </p>
          </div>
          <div className="ec-metrics-grid">
            <article className="ec-metric-card">
              <p className="ec-overline">Sessoes concluidas</p>
              <strong className="ec-metric-value">
                {metrics ? `${metrics.sessions.completion_rate}%` : "N/D"}
              </strong>
              <span className="ec-muted">
                {metrics
                  ? `${metrics.sessions.completed} concluidas de ${metrics.sessions.total}`
                  : "Sem dados"}
              </span>
            </article>

            <article className="ec-metric-card">
              <p className="ec-overline">Fila de documentos</p>
              <strong className="ec-metric-value">
                {metrics ? `${metrics.queue.active} ativos` : "N/D"}
              </strong>
              <span className="ec-muted">
                {metrics
                  ? `${metrics.queue.waiting} em fila, ${metrics.queue.failed} falhas`
                  : "Sem dados"}
              </span>
            </article>

            <article className="ec-metric-card">
              <p className="ec-overline">API p95</p>
              <strong className="ec-metric-value">
                {metrics ? `${metrics.api.overall.p95_ms} ms` : "N/D"}
              </strong>
              <span className="ec-muted">
                {metrics
                  ? `${metrics.api.overall.total_requests} requisicoes, erro ${(metrics.api.overall.error_rate * 100).toFixed(2)}%`
                  : "Sem dados"}
              </span>
            </article>
          </div>
        </section>

        {feedback ? <p className="ec-feedback">{feedback}</p> : null}
      </main>
    </div>
  );
}
