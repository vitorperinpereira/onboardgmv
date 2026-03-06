"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { onboardingSteps, OnboardingStep } from "@/types/domain";
import { persistSessionId, SESSION_TOKEN_KEY } from "@/lib/frontendContext";

type SessionInfo = {
  session_id: string;
  token: string;
  status: string;
};

const stepLabels: Record<OnboardingStep, string> = {
  essencia: "Essencia",
  posicionamento: "Posicionamento",
  publico: "Publico",
  prova: "Prova",
  personalidade: "Personalidade",
  futuro: "Futuro",
};

const stepPrompts: Record<
  OnboardingStep,
  {
    question: string;
    description: string;
    placeholder: string;
  }
> = {
  essencia: {
    question: "Qual futuro essa marca quer construir e por que isso importa agora?",
    description: "Foque no problema real e na transformacao desejada. Evite frases vagas.",
    placeholder: "Nosso objetivo e tornar previsivel o crescimento de clinicas com dados acionaveis...",
  },
  posicionamento: {
    question: "Qual o posicionamento que diferencia essa clinica no mercado?",
    description: "Explique com evidencias, comparativos e recorte de vantagem competitiva.",
    placeholder: "Diferente de abordagens generalistas, operamos com protocolos auditaveis...",
  },
  publico: {
    question: "Quem e o publico principal e como ele toma decisao?",
    description: "Descreva perfil, dores, contexto de compra e objecoes recorrentes.",
    placeholder: "Nosso publico chave tem entre 28 e 52 anos e busca previsibilidade...",
  },
  prova: {
    question: "Que provas sustentam a promessa da marca?",
    description: "Traga dados, resultados historicos, metodo e consistencia operacional.",
    placeholder: "Em 12 meses, 248 pacientes passaram pelo protocolo e 39% retornaram...",
  },
  personalidade: {
    question: "Como a marca deve soar em qualquer canal?",
    description: "Defina tom, limites de linguagem, vocabulario aprovado e proibido.",
    placeholder: "A marca fala com clareza tecnica, sem exagero e sem urgencia artificial...",
  },
  futuro: {
    question: "Qual estrategia para os proximos 12-18 meses?",
    description: "Liste prioridades, metricas alvo e criterios de sucesso.",
    placeholder: "Nos proximos 18 meses, queremos elevar a recorrencia em 22% sem perder qualidade...",
  },
};

function nextProgress(step: OnboardingStep) {
  return Math.round(((onboardingSteps.indexOf(step) + 1) / onboardingSteps.length) * 100);
}

export default function InterviewPage() {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [clientName, setClientName] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [email, setEmail] = useState("");

  const [currentStep, setCurrentStep] = useState<OnboardingStep>("essencia");
  const [progress, setProgress] = useState(0);
  const [response, setResponse] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [followups, setFollowups] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const activeIndex = useMemo(() => onboardingSteps.indexOf(currentStep), [currentStep]);
  const prompt = stepPrompts[currentStep];

  useEffect(() => {
    const savedToken = localStorage.getItem(SESSION_TOKEN_KEY);
    if (!savedToken) {
      return;
    }

    const restore = async () => {
      const response = await fetch(`/api/onboarding/session/${savedToken}`);
      if (!response.ok) {
        localStorage.removeItem(SESSION_TOKEN_KEY);
        return;
      }

      const payload = await response.json();
      const status = payload.session.status as string;
      const token = payload.session.token as string;
      const sessionId = payload.session.id as string;

      setSession({
        session_id: sessionId,
        token,
        status,
      });

      persistSessionId(sessionId);

      if (payload.current_step) {
        const step = payload.current_step as OnboardingStep;
        setCurrentStep(step);
        setProgress(payload.progress ?? nextProgress(step));
      } else {
        setProgress(100);
      }

      setMessage("Sessao restaurada.");
    };

    restore().catch(() => {
      localStorage.removeItem(SESSION_TOKEN_KEY);
    });
  }, []);

  const createSession = async () => {
    if (!clientName.trim() || !clinicName.trim() || !email.trim()) {
      setError("Preencha todos os campos para iniciar.");
      return;
    }

    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/onboarding/session", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          client_name: clientName.trim(),
          clinic_name: clinicName.trim(),
          email: email.trim(),
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload?.details ?? "Nao foi possivel criar a sessao.");
        return;
      }

      setSession(payload);
      setProgress(0);
      setCurrentStep("essencia");
      setResponse("");
      setFollowups([]);
      setScore(null);
      localStorage.setItem(SESSION_TOKEN_KEY, payload.token);
      persistSessionId(payload.session_id);
      setMessage("Sessao criada. Inicie a primeira resposta.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erro ao iniciar sessao.");
    } finally {
      setIsLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!session) {
      return;
    }

    if (response.trim().length < 8) {
      setError("Resposta muito curta. Traga contexto real.");
      return;
    }

    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      const request = await fetch("/api/onboarding/answer", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          token: session.token,
          step: currentStep,
          answers: { response: response.trim() },
        }),
      });
      const payload = await request.json();

      if (!request.ok) {
        setError(payload?.details ?? "Falha ao enviar resposta.");
        return;
      }

      setScore(payload.specificity_score);
      setFollowups(payload.followups ?? []);

      if (!payload.accepted) {
        setMessage("A resposta ainda esta generica. Revise as perguntas de aprofundamento.");
        return;
      }

      if (payload.next_step) {
        const next = payload.next_step as OnboardingStep;
        setCurrentStep(next);
        setProgress(nextProgress(next));
        setResponse("");
        if (payload.accepted_with_relaxation) {
          setMessage("Resposta salva com ressalvas para evitar bloqueio. Reforce detalhes nas proximas etapas.");
        } else {
          setMessage("Etapa aprovada. Avance para a proxima.");
        }
      } else {
        setSession((prev) => (prev ? { ...prev, status: "completed" } : prev));
        setProgress(100);
        setResponse("");
        setMessage("Entrevista concluida. Gere o manifesto na Biblioteca.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erro ao enviar resposta.");
    } finally {
      setIsLoading(false);
    }
  };

  const clearLocalSession = () => {
    localStorage.removeItem(SESSION_TOKEN_KEY);
    setSession(null);
    setCurrentStep("essencia");
    setProgress(0);
    setResponse("");
    setFollowups([]);
    setScore(null);
    setMessage("Sessao local removida.");
    setError("");
  };

  return (
    <div className="ec-shell ec-interview-shell">
      <header className="ec-interview-topbar">
        <div className="ec-brand">
          <span className="ec-brand-icon">edit_note</span>
          <h1>Editorial Canvas</h1>
        </div>
        <div className="ec-topbar-actions">
          <Link href="/" className="ec-text-link">
            Biblioteca
          </Link>
        </div>
      </header>

      <div className="ec-progress-bar">
        <span style={{ width: `${progress}%` }} />
      </div>

      {!session ? (
        <main className="ec-main">
          <section className="ec-card ec-interview-start">
            <h2>Entrevista</h2>
            <p className="ec-muted">Crie a sessao de onboarding para iniciar a entrevista estrategica.</p>
            <input
              value={clientName}
              onChange={(event) => setClientName(event.target.value)}
              placeholder="Nome do responsavel"
            />
            <input
              value={clinicName}
              onChange={(event) => setClinicName(event.target.value)}
              placeholder="Nome da clinica"
            />
            <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" />
            <button type="button" onClick={createSession} disabled={isLoading}>
              {isLoading ? "Criando..." : "Criar sessao"}
            </button>
          </section>
          {message ? <p className="ec-feedback">{message}</p> : null}
          {error ? <p className="error">{error}</p> : null}
        </main>
      ) : (
        <main className="ec-interview-layout">
          <aside className="ec-interview-nav">
            <h3>Etapas</h3>
            <p className="ec-muted">Definicao estrategica</p>
            <ul>
              {onboardingSteps.map((step, index) => {
                const done = progress === 100 || index < activeIndex;
                const active = index === activeIndex && progress < 100;
                const className = `ec-step-link ${active ? "active" : ""} ${done ? "done" : ""}`.trim();
                return (
                  <li key={step} className={className}>
                    <span>{index + 1}.</span>
                    <strong>{stepLabels[step]}</strong>
                  </li>
                );
              })}
            </ul>
            <button type="button" className="ec-minor-button" onClick={clearLocalSession}>
              Limpar sessao
            </button>
          </aside>

          <section className="ec-interview-editor">
            <span className="ec-overline">Etapa {activeIndex + 1}</span>
            <h2>{prompt.question}</h2>
            <p className="ec-muted">{prompt.description}</p>
            <textarea
              value={response}
              onChange={(event) => setResponse(event.target.value)}
              placeholder={prompt.placeholder}
            />
            <div className="ec-editor-actions">
              <button type="button" onClick={submitAnswer} disabled={isLoading}>
                {isLoading ? "Analisando..." : "Proxima etapa"}
              </button>
              {score !== null ? <p className="ec-muted">Pontuacao de especificidade: {score}</p> : null}
            </div>
            {message ? <p className="ec-feedback">{message}</p> : null}
            {error ? <p className="error">{error}</p> : null}
          </section>

          <aside className="ec-interview-notes">
            <h3>Observacoes do agente</h3>
            {followups.length > 0 ? (
              <ul>
                {followups.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="ec-muted">Envie uma resposta para receber ajustes e pontos de melhoria.</p>
            )}
            <div className="ec-notes-footer">
              <Link href={`/?session=${session.session_id}`}>Ir para a biblioteca</Link>
            </div>
          </aside>
        </main>
      )}
    </div>
  );
}

