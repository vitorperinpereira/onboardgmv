"use client";

import { useMemo, useState } from "react";

type SessionBundle = {
  session: {
    id: string;
    status: string;
    created_at: string;
  };
  client: {
    name: string;
    clinic_name: string;
    email: string;
  };
};

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
    routes: Record<
      string,
      {
        count: number;
        avg_ms: number;
        p95_ms: number;
        p99_ms: number;
        max_ms: number;
        error_rate: number;
        last_status: number;
        last_seen_at: string;
      }
    >;
  };
};

export default function AdminPage() {
  const [adminToken, setAdminToken] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("gmv_admin_token") ?? "" : "",
  );
  const [sessions, setSessions] = useState<SessionBundle[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [metrics, setMetrics] = useState<OperationalMetrics | null>(null);
  const [documents, setDocuments] = useState<string>("");
  const [contentToReview, setContentToReview] = useState("");
  const [reviewResult, setReviewResult] = useState<string>("");
  const [copyObjective, setCopyObjective] = useState("Gerar copy para video curto");
  const [copyFormat, setCopyFormat] = useState("instagram_reel");
  const [copyResult, setCopyResult] = useState("");
  const [feedback, setFeedback] = useState("");

  const authHeaders = useMemo(
    () => ({
      "content-type": "application/json",
      "x-admin-token": adminToken,
    }),
    [adminToken],
  );

  const loadSessions = async () => {
    setFeedback("");
    const res = await fetch("/api/admin/sessions", {
      headers: {
        "x-admin-token": adminToken,
      },
    });

    if (!res.ok) {
      setFeedback("Falha ao carregar sessoes. Verifique o token admin.");
      return;
    }

    const data = await res.json();
    setSessions(data.sessions ?? []);
    if (data.sessions?.[0]?.session?.id) {
      setSelectedSessionId(data.sessions[0].session.id);
    }
  };

  const loadMetrics = async () => {
    const res = await fetch("/api/admin/metrics", {
      headers: {
        "x-admin-token": adminToken,
      },
    });

    const data = await res.json();
    if (!res.ok) {
      setFeedback(data?.details ?? "Falha ao carregar metricas operacionais.");
      return;
    }

    setMetrics(data as OperationalMetrics);
  };

  const triggerDocumentGeneration = async () => {
    if (!selectedSessionId) {
      return;
    }

    const res = await fetch("/api/documents/generate", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        session_id: selectedSessionId,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setFeedback(data?.details ?? "Falha ao gerar documentos.");
      return;
    }

    setFeedback(`Geracao iniciada. Status: ${data.status}`);
    await loadMetrics();
  };

  const loadDocuments = async () => {
    if (!selectedSessionId) {
      return;
    }

    const res = await fetch(`/api/documents/${selectedSessionId}`, {
      headers: {
        "x-admin-token": adminToken,
      },
    });

    const data = await res.json();
    if (!res.ok) {
      setFeedback(data?.details ?? "Documentos nao encontrados.");
      return;
    }

    setDocuments(JSON.stringify(data, null, 2));
    setFeedback("Documentos carregados.");
  };

  const reviewContent = async () => {
    if (!selectedSessionId || !contentToReview) {
      return;
    }

    const res = await fetch("/api/content/review", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        session_id: selectedSessionId,
        content_submitted: contentToReview,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setFeedback(data?.details ?? "Falha ao revisar conteudo.");
      return;
    }

    setReviewResult(JSON.stringify(data, null, 2));
    setFeedback("Review concluido.");
  };

  const createCopy = async () => {
    if (!selectedSessionId) {
      return;
    }

    const res = await fetch("/api/content/create", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        session_id: selectedSessionId,
        objective: copyObjective,
        format: copyFormat,
        constraints: ["Nao usar promessas absolutas", "Tom racional"],
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setFeedback(data?.details ?? "Falha ao criar copy.");
      return;
    }

    setCopyResult(JSON.stringify(data, null, 2));
    setFeedback("Copy gerada.");
  };

  return (
    <main className="grid" style={{ gap: 20 }}>
      <div className="card grid" style={{ gap: 10 }}>
        <h1>Painel interno GMV</h1>
        <p className="muted">
          Operacoes de sessao, documentos estrategicos, review, criacao de copy e observabilidade operacional.
        </p>
        <input
          value={adminToken}
          onChange={(event) => setAdminToken(event.target.value)}
          placeholder="x-admin-token"
        />
        <div className="grid grid-2">
          <button
            type="button"
            onClick={() => {
              localStorage.setItem("gmv_admin_token", adminToken);
              void loadSessions();
              void loadMetrics();
            }}
          >
            Salvar token e carregar dados
          </button>
          <button type="button" onClick={loadMetrics}>
            Atualizar metricas
          </button>
        </div>
      </div>

      <div className="card grid" style={{ gap: 10 }}>
        <h2>Dashboard operacional</h2>
        {metrics ? (
          <div className="grid grid-2">
            <div>
              <strong>Sessoes</strong>
              <p>Total: {metrics.sessions.total}</p>
              <p>Concluidas: {metrics.sessions.completed}</p>
              <p>Em progresso: {metrics.sessions.in_progress}</p>
              <p>Taxa de conclusao: {metrics.sessions.completion_rate}%</p>
            </div>
            <div>
              <strong>Fila BullMQ</strong>
              <p>Configurada: {metrics.queue.configured ? "sim" : "nao"}</p>
              <p>Em fila: {metrics.queue.waiting}</p>
              <p>Ativas: {metrics.queue.active}</p>
              <p>Concluidas: {metrics.queue.completed}</p>
              <p>Falhas: {metrics.queue.failed}</p>
            </div>
            <div>
              <strong>APIs</strong>
              <p>Rotas monitoradas: {metrics.api.overall.tracked_routes}</p>
              <p>Requisicoes totais: {metrics.api.overall.total_requests}</p>
              <p>p95: {metrics.api.overall.p95_ms}ms</p>
              <p>p99: {metrics.api.overall.p99_ms}ms</p>
              <p>Taxa de erro: {(metrics.api.overall.error_rate * 100).toFixed(2)}%</p>
            </div>
          </div>
        ) : (
          <p className="muted">Sem metricas carregadas.</p>
        )}
      </div>

      <div className="card grid" style={{ gap: 12 }}>
        <h2>Sessoes</h2>
        <select value={selectedSessionId} onChange={(event) => setSelectedSessionId(event.target.value)}>
          <option value="">Selecione</option>
          {sessions.map((bundle) => (
            <option key={bundle.session.id} value={bundle.session.id}>
              {bundle.client.clinic_name} - {bundle.session.status}
            </option>
          ))}
        </select>

        <div className="grid grid-2">
          <button type="button" onClick={triggerDocumentGeneration}>
            Gerar documentos
          </button>
          <button type="button" onClick={loadDocuments}>
            Carregar documentos
          </button>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card grid" style={{ gap: 8 }}>
          <h3>Review de conteudo</h3>
          <textarea
            value={contentToReview}
            onChange={(event) => setContentToReview(event.target.value)}
            placeholder="Cole aqui a copy/roteiro para avaliacao"
          />
          <button type="button" onClick={reviewContent}>
            Revisar alinhamento
          </button>
          <pre>{reviewResult}</pre>
        </div>

        <div className="card grid" style={{ gap: 8 }}>
          <h3>Criacao de copy</h3>
          <input value={copyObjective} onChange={(event) => setCopyObjective(event.target.value)} />
          <input value={copyFormat} onChange={(event) => setCopyFormat(event.target.value)} />
          <button type="button" onClick={createCopy}>
            Gerar copy
          </button>
          <pre>{copyResult}</pre>
        </div>
      </div>

      <div className="card">
        <h3>Documentos estrategicos</h3>
        <pre>{documents}</pre>
      </div>

      {feedback ? <p>{feedback}</p> : null}
    </main>
  );
}
