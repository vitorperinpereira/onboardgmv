"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  fetchAdminSessions,
  loadEditorialContext,
  persistAdminToken,
  persistSessionId,
  SessionBundle,
} from "@/lib/frontendContext";

type ReviewResponse = {
  alignment_score: number;
  strengths: string[];
  misalignments: string[];
  justification: string;
  suggestions: string[];
};

type CopyResponse = {
  copy_variants: string[];
  rationale: string;
};

export default function AlignmentEditorPage() {
  const [adminToken, setAdminToken] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [sessions, setSessions] = useState<SessionBundle[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  const [draft, setDraft] = useState("");
  const [objective, setObjective] = useState("Gerar roteiro de anuncio para instagram");
  const [format, setFormat] = useState("instagram_reel");
  const [constraints, setConstraints] = useState("Nao usar promessas absolutas\nTom racional");

  const [review, setReview] = useState<ReviewResponse | null>(null);
  const [copy, setCopy] = useState<CopyResponse | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [feedback, setFeedback] = useState("");

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

    if (context.adminToken) {
      void loadSessionOptions(context.adminToken, context.sessionId, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (sessionId) {
      persistSessionId(sessionId);
    }
  }, [sessionId]);

  const analyze = async (contentOverride?: string) => {
    const contentToAnalyze = (contentOverride ?? draft).trim();

    if (!sessionId.trim() || !adminToken.trim() || !contentToAnalyze) {
      setFeedback("Preencha token, session_id e o texto para revisao.");
      return;
    }

    setIsReviewing(true);
    setFeedback("");

    try {
      const response = await fetch("/api/content/review", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-token": adminToken.trim(),
        },
        body: JSON.stringify({
          session_id: sessionId.trim(),
          content_submitted: contentToAnalyze,
        }),
      });

      const body = (await response.json().catch(() => null)) as
        | {
            details?: string;
          }
        | ReviewResponse
        | null;
      if (!response.ok) {
        const details = body && "details" in body ? body.details ?? "Falha ao revisar texto." : "Falha ao revisar texto.";
        setFeedback(details);
        return;
      }

      setReview(body as ReviewResponse);
    } catch (cause) {
      setFeedback(cause instanceof Error ? cause.message : "Erro ao revisar.");
    } finally {
      setIsReviewing(false);
    }
  };

  const generateCopy = async () => {
    if (!sessionId.trim() || !adminToken.trim()) {
      setFeedback("Preencha token admin e session_id.");
      return;
    }

    setIsCreating(true);
    setFeedback("");

    try {
      const response = await fetch("/api/content/create", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-admin-token": adminToken.trim(),
        },
        body: JSON.stringify({
          session_id: sessionId.trim(),
          objective: objective.trim(),
          format: format.trim(),
          constraints: constraints
            .split(/\n|,/)
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      });

      const body = (await response.json().catch(() => null)) as
        | {
            details?: string;
          }
        | CopyResponse
        | null;
      if (!response.ok) {
        const details = body && "details" in body ? body.details ?? "Falha ao gerar copy." : "Falha ao gerar copy.";
        setFeedback(details);
        return;
      }

      setCopy(body as CopyResponse);
    } catch (cause) {
      setFeedback(cause instanceof Error ? cause.message : "Erro ao gerar copy.");
    } finally {
      setIsCreating(false);
    }
  };

  const sessionQuery = sessionId ? `?session=${sessionId}` : "";

  return (
    <div className="ec-shell ec-alignment-shell">
      <header className="ec-topbar">
        <div className="ec-brand">
          <span className="ec-brand-icon">menu_book</span>
          <h1>Editor de alinhamento</h1>
        </div>
        <div className="ec-topbar-actions">
          <Link href="/">Biblioteca</Link>
          <Link href={`/manifesto${sessionQuery}`}>Manifesto</Link>
          <Link href={`/brand-bible${sessionQuery}`}>Guia de marca</Link>
        </div>
      </header>

      <main className="ec-main ec-alignment-main">
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
                void loadSessionOptions();
              }}
              disabled={isLoadingSessions}
            >
              {isLoadingSessions ? "Carregando..." : "Atualizar sessoes"}
            </button>
            <button
              type="button"
              onClick={() => {
                void analyze();
              }}
              disabled={isReviewing}
            >
              {isReviewing ? "Analisando..." : "Analisar texto"}
            </button>
          </div>
          {feedback ? <p className="ec-feedback">{feedback}</p> : null}
        </section>

        <section className="ec-alignment-split">
          <article className="ec-editor-pane">
            <h2>Rascunho</h2>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Cole aqui a copy para analise de alinhamento."
            />

            <div className="ec-copy-creation">
              <h3>Criacao de copy</h3>
              <input value={objective} onChange={(event) => setObjective(event.target.value)} placeholder="Objetivo" />
              <input value={format} onChange={(event) => setFormat(event.target.value)} placeholder="Formato" />
              <textarea
                value={constraints}
                onChange={(event) => setConstraints(event.target.value)}
                placeholder="Uma restricao por linha"
              />
              <button type="button" onClick={generateCopy} disabled={isCreating}>
                {isCreating ? "Gerando..." : "Gerar variantes"}
              </button>
            </div>
          </article>

          <article className="ec-analysis-pane">
            {review ? (
              <div className="ec-score-block">
                <h3>Pontuacao</h3>
                <p className="ec-score">{review.alignment_score}</p>
                <p>{review.justification}</p>
              </div>
            ) : (
              <div className="ec-empty-card">
                <h3>Sem analise</h3>
                <p className="ec-muted">Clique em Analisar texto para obter pontuacao, forcas e ajustes.</p>
              </div>
            )}

            {review ? (
              <div className="ec-analysis-list">
                <div>
                  <h4>Forcas</h4>
                  <ul>
                    {review.strengths.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4>Desalinhamentos</h4>
                  <ul>
                    {review.misalignments.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4>Sugestoes</h4>
                  <ul>
                    {review.suggestions.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}

            {copy ? (
              <div className="ec-copy-result">
                <h4>Variantes de copy</h4>
                <p>{copy.rationale}</p>
                <ol>
                  {copy.copy_variants.map((variant, index) => (
                    <li key={`${index}-${variant.slice(0, 24)}`} className="ec-copy-variant">
                      <p>{variant}</p>
                      <div className="ec-copy-variant-actions">
                        <button
                          type="button"
                          onClick={() => {
                            setDraft(variant);
                            setFeedback("Variante aplicada no draft.");
                          }}
                        >
                          Usar no rascunho
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDraft(variant);
                            void analyze(variant);
                          }}
                          disabled={isReviewing}
                        >
                          Revisar variante
                        </button>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </article>
        </section>
      </main>
    </div>
  );
}
