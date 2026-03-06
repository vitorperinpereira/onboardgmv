"use client";

import { useEffect, useMemo, useState } from "react";
import { onboardingSteps, OnboardingStep } from "@/types/domain";

const stepLabels: Record<OnboardingStep, string> = {
  essencia: "Essencia",
  posicionamento: "Posicionamento",
  publico: "Publico",
  prova: "Prova",
  personalidade: "Personalidade",
  futuro: "Futuro",
};

const stepGuides: Record<
  OnboardingStep,
  {
    title: string;
    hint: string;
    example: string;
  }
> = {
  essencia: {
    title: "O que a clinica resolve na pratica?",
    hint: "Detalhe contexto real, volume e impacto. Evite frases como 'somos unicos' sem evidencias.",
    example: "Nos ultimos 12 meses atendemos 248 pacientes com queda cronica e 39% retornaram em ate 90 dias.",
  },
  posicionamento: {
    title: "Qual a diferenca competitiva sustentavel?",
    hint: "Mostre o criterio que te separa do mercado e com quais evidencias voce sustenta isso.",
    example: "Nossa proposta e guiada por protocolo auditavel, com adesao media de 78% em 2025.",
  },
  publico: {
    title: "Quem e o publico prioritario?",
    hint: "Defina recorte de perfil, dor principal e gatilho de busca com sinais concretos.",
    example: "Adultos de 28 a 52 anos, com perda capilar cronica e alta exigencia por previsibilidade.",
  },
  prova: {
    title: "Quais provas sustentam o discurso?",
    hint: "Use dados, auditorias, casos e periodos. O ideal e descrever resultado + metodo de medicao.",
    example: "Temos 137 casos auditados, com melhora observavel em 71% apos 120 dias.",
  },
  personalidade: {
    title: "Como a marca fala e decide?",
    hint: "Traga tom de voz, limites e padroes editoriais para manter consistencia em qualquer canal.",
    example: "Tom tecnico e humano, sem urgencia artificial, com CTA orientado por avaliacao clinica.",
  },
  futuro: {
    title: "Qual o norte de 12 a 18 meses?",
    hint: "Defina metas priorizadas com indicador, horizonte e condicao de qualidade.",
    example: "Meta de elevar recorrencia em 22% em 18 meses mantendo qualidade diagnostica.",
  },
};

const MIN_RESPONSE_LENGTH = 12;

type SessionInfo = {
  session_id: string;
  token: string;
  status: string;
};

function calculateProgress(step: OnboardingStep) {
  return Math.round(((onboardingSteps.indexOf(step) + 1) / onboardingSteps.length) * 100);
}

export function OnboardingWizard() {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [clientName, setClientName] = useState("");
  const [clinicName, setClinicName] = useState("");
  const [email, setEmail] = useState("");

  const [currentStep, setCurrentStep] = useState<OnboardingStep>("essencia");
  const [progress, setProgress] = useState(0);
  const [response, setResponse] = useState("");
  const [followups, setFollowups] = useState<string[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeIndex = useMemo(() => onboardingSteps.indexOf(currentStep), [currentStep]);
  const guide = stepGuides[currentStep];
  const canSubmit = response.trim().length >= MIN_RESPONSE_LENGTH && !isLoading;
  const canStart = Boolean(clientName.trim() && clinicName.trim() && email.trim());
  const safeProgress = session?.status === "completed" ? 100 : progress;

  useEffect(() => {
    const savedToken = localStorage.getItem("gmv_session_token");
    if (!savedToken) {
      return;
    }

    const loadSession = async () => {
      const res = await fetch(`/api/onboarding/session/${savedToken}`);
      if (!res.ok) {
        localStorage.removeItem("gmv_session_token");
        return;
      }

      const data = await res.json();
      setSession({
        session_id: data.session.id,
        token: data.session.token,
        status: data.session.status,
      });

      if (data.current_step) {
        setCurrentStep(data.current_step as OnboardingStep);
        setProgress(data.progress ?? calculateProgress(data.current_step as OnboardingStep));
      } else {
        setProgress(data.progress ?? 0);
      }

      setMessage("Sessao retomada com sucesso.");
    };

    loadSession().catch(() => {
      localStorage.removeItem("gmv_session_token");
    });
  }, []);

  const resetLocalSession = () => {
    localStorage.removeItem("gmv_session_token");
    setSession(null);
    setCurrentStep("essencia");
    setProgress(0);
    setResponse("");
    setFollowups([]);
    setScore(null);
    setMessage("Sessao local limpa.");
    setError(null);
  };

  const createSession = async () => {
    setError(null);
    setMessage(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/onboarding/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          client_name: clientName.trim(),
          clinic_name: clinicName.trim(),
          email: email.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error("Nao foi possivel criar a sessao.");
      }

      const data = await res.json();
      setSession(data);
      setCurrentStep("essencia");
      setProgress(0);
      setFollowups([]);
      setScore(null);
      localStorage.setItem("gmv_session_token", data.token);
      setMessage("Sessao iniciada com sucesso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar sessao.");
    } finally {
      setIsLoading(false);
    }
  };

  const sendAnswer = async () => {
    if (!session) {
      return;
    }

    setError(null);
    setMessage(null);
    setIsLoading(true);

    try {
      const normalizedResponse = response.trim();
      const res = await fetch("/api/onboarding/answer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token: session.token,
          step: currentStep,
          answers: {
            response: normalizedResponse,
          },
        }),
      });

      if (!res.ok) {
        throw new Error("Falha ao enviar resposta.");
      }

      const data = await res.json();
      setScore(data.specificity_score);
      setFollowups(data.followups ?? []);

      if (data.accepted) {
        if (data.next_step) {
          const nextStep = data.next_step as OnboardingStep;
          setCurrentStep(nextStep);
          setProgress(calculateProgress(nextStep));
          setSession((prev) => (prev ? { ...prev, status: "in_progress" } : prev));
          setMessage("Resposta aceita. Proxima etapa liberada.");
        } else {
          setProgress(100);
          setSession((prev) => (prev ? { ...prev, status: "completed" } : prev));
          setMessage("Onboarding concluido. Agora voce pode gerar documentos no painel admin.");
        }
        setResponse("");
      } else {
        setMessage("Resposta ainda generica. Inclua exemplos, periodo e indicadores.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar resposta.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="wizard">
      {!session ? (
        <div className="card wizard-start">
          <div>
            <h2>Iniciar onboarding</h2>
            <p className="muted">Cadastre o responsavel para abrir uma sessao segura e retomar quando necessario.</p>
          </div>

          <div className="wizard-form-grid">
            <label className="field">
              <span>Nome do responsavel</span>
              <input
                value={clientName}
                onChange={(event) => setClientName(event.target.value)}
                placeholder="Ex.: Isabella Marins"
              />
            </label>

            <label className="field">
              <span>Clinica</span>
              <input
                value={clinicName}
                onChange={(event) => setClinicName(event.target.value)}
                placeholder="Ex.: GMV Tricologia"
              />
            </label>

            <label className="field field-full">
              <span>Email</span>
              <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="contato@clinica.com" />
            </label>
          </div>

          <button onClick={createSession} disabled={isLoading || !canStart} type="button">
            {isLoading ? "Criando..." : "Criar sessao"}
          </button>
        </div>
      ) : (
        <div className="wizard-shell">
          <aside className="card wizard-sidebar">
            <div className="wizard-session-meta">
              <span className="badge">Sessao ativa</span>
              <p className="muted">ID: {session.session_id.slice(0, 8)}...</p>
              <p className="muted">Status: {session.status}</p>
            </div>

            <div className="wizard-progress">
              <div className="wizard-progress-head">
                <strong>Progresso</strong>
                <span>{safeProgress}%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${safeProgress}%` }} />
              </div>
            </div>

            <ol className="wizard-step-list">
              {onboardingSteps.map((step, index) => {
                const isDone = safeProgress === 100 || index < activeIndex;
                const isActive = index === activeIndex && safeProgress < 100;
                const className = `wizard-step-item ${isDone ? "done" : ""} ${isActive ? "active" : ""}`.trim();
                return (
                  <li key={step} className={className}>
                    <span className="wizard-step-index">{index + 1}</span>
                    <span>{stepLabels[step]}</span>
                  </li>
                );
              })}
            </ol>

            <button className="button-secondary" onClick={resetLocalSession} type="button">
              Limpar sessao local
            </button>
          </aside>

          <div className="card wizard-main">
            <div className="wizard-main-head">
              <span className="badge">
                Etapa {Math.min(activeIndex + 1, onboardingSteps.length)} de {onboardingSteps.length}
              </span>
              <h3>{guide.title}</h3>
              <p className="muted">{guide.hint}</p>
            </div>

            <div className="wizard-brief">
              <strong>Exemplo de direcao concreta</strong>
              <p>{guide.example}</p>
              <button className="button-ghost" type="button" onClick={() => setResponse(guide.example)}>
                Usar exemplo como base
              </button>
            </div>

            <label className="field">
              <span>Resposta da etapa</span>
              <textarea
                value={response}
                onChange={(event) => setResponse(event.target.value)}
                placeholder="Inclua contexto, periodo, numeros e exemplos reais."
              />
            </label>

            <div className="wizard-actions">
              <button disabled={!canSubmit} onClick={sendAnswer} type="button">
                {isLoading ? "Enviando..." : "Enviar resposta"}
              </button>
              <p className="muted">Minimo recomendado: {MIN_RESPONSE_LENGTH} caracteres com contexto verificavel.</p>
            </div>

            {score !== null ? <p className="muted">Pontuacao de especificidade: {score}</p> : null}

            {followups.length > 0 ? (
              <div className="wizard-followups">
                <strong>Follow-ups sugeridos</strong>
                <ul>
                  {followups.map((followup) => (
                    <li key={followup}>{followup}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {message ? <p className="status-ok">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}
