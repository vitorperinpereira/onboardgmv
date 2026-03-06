import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

type Json = Record<string, unknown>;

type PilotRun = {
  pilot: number;
  sessionId: string;
  token: string;
  onboardingCompleted: boolean;
  docGenerated: boolean;
  reviewScore: number;
  copyVariants: number;
  errors: string[];
};

const steps = [
  "essencia",
  "posicionamento",
  "publico",
  "prova",
  "personalidade",
  "futuro",
] as const;

const specificAnswers: Record<(typeof steps)[number], string> = {
  essencia:
    "Por exemplo, em 12 meses atendemos 248 pacientes de tricologia, com retorno de 39% em 90 dias e ticket medio de R$ 1.820.",
  posicionamento:
    "Posicionamento orientado por evidencia: tres protocolos auditados em 2025 com adesao media de 78% e criterio clinico explicito.",
  publico:
    "Publico principal de 28 a 52 anos com queda cronica, alta exigencia por previsibilidade e necessidade de acompanhamento tecnico claro.",
  prova:
    "Base com 137 casos auditados, melhora observavel em 71% apos 120 dias, com comparativo fotografico padronizado.",
  personalidade:
    "Tom tecnico e humano sem urgencia artificial; 92% das pecas de 2025 mantiveram coerencia editorial e CTA racional.",
  futuro:
    "Meta de elevar recorrencia em 22% nos proximos 18 meses, com reducao de retrabalho em 15% e revisao trimestral de indicadores.",
};

async function requestJson<T>(input: {
  baseUrl: string;
  path: string;
  method?: "GET" | "POST";
  body?: Json;
  headers?: Record<string, string>;
}): Promise<{ status: number; data: T }> {
  const response = await fetch(`${input.baseUrl}${input.path}`, {
    method: input.method ?? "GET",
    headers: {
      "content-type": "application/json",
      ...(input.headers ?? {}),
    },
    body: input.body ? JSON.stringify(input.body) : undefined,
  });

  const data = (await response.json()) as T;
  return {
    status: response.status,
    data,
  };
}

async function runPilot(input: {
  pilot: number;
  baseUrl: string;
  adminToken: string;
}): Promise<PilotRun> {
  const errors: string[] = [];

  const created = await requestJson<{ session_id: string; token: string; status: string }>({
    baseUrl: input.baseUrl,
    path: "/api/onboarding/session",
    method: "POST",
    body: {
      client_name: `Pilot ${input.pilot}`,
      clinic_name: `GMV Pilot ${input.pilot}`,
      email: `pilot${input.pilot}@gmv.local`,
    },
  });

  if (created.status !== 201) {
    return {
      pilot: input.pilot,
      sessionId: "",
      token: "",
      onboardingCompleted: false,
      docGenerated: false,
      reviewScore: 0,
      copyVariants: 0,
      errors: [`Falha ao criar sessao (${created.status}).`],
    };
  }

  const sessionId = created.data.session_id;
  const token = created.data.token;

  const genericAttempt = await requestJson<{ accepted: boolean; followups: string[] }>({
    baseUrl: input.baseUrl,
    path: "/api/onboarding/answer",
    method: "POST",
    body: {
      token,
      step: "essencia",
      answers: { response: "Somos diferenciados e inovadores." },
    },
  });

  if (genericAttempt.status !== 200 || genericAttempt.data.accepted !== false) {
    errors.push("Regra de resposta generica nao validada na etapa essencia.");
  }

  for (const step of steps) {
    const answerRes = await requestJson<{ accepted: boolean; specificity_score: number }>({
      baseUrl: input.baseUrl,
      path: "/api/onboarding/answer",
      method: "POST",
      body: {
        token,
        step,
        answers: {
          response: specificAnswers[step],
        },
      },
    });

    if (answerRes.status !== 200 || !answerRes.data.accepted) {
      errors.push(`Resposta da etapa ${step} nao foi aceita.`);
    }
  }

  const sessionState = await requestJson<{ session: { status: string } }>({
    baseUrl: input.baseUrl,
    path: `/api/onboarding/session/${token}`,
  });

  const onboardingCompleted = sessionState.status === 200 && sessionState.data.session.status === "completed";
  if (!onboardingCompleted) {
    errors.push("Sessao nao finalizou como completed.");
  }

  const generate = await requestJson<{ status: string }>({
    baseUrl: input.baseUrl,
    path: "/api/documents/generate",
    method: "POST",
    headers: {
      "x-admin-token": input.adminToken,
    },
    body: {
      session_id: sessionId,
    },
  });

  const docs = await requestJson<{ manifesto: string }>({
    baseUrl: input.baseUrl,
    path: `/api/documents/${sessionId}`,
    headers: {
      "x-admin-token": input.adminToken,
    },
  });

  const docGenerated = generate.status < 300 && docs.status === 200 && docs.data.manifesto.length > 40;
  if (!docGenerated) {
    errors.push("Documentos estrategicos nao foram gerados corretamente.");
  }

  const review = await requestJson<{ alignment_score: number }>({
    baseUrl: input.baseUrl,
    path: "/api/content/review",
    method: "POST",
    headers: {
      "x-admin-token": input.adminToken,
    },
    body: {
      session_id: sessionId,
      content_submitted:
        "Por exemplo, em 90 dias acompanhamos 48 pacientes e elevamos aderencia em 18% com protocolo orientado por evidencia.",
    },
  });

  if (review.status !== 200) {
    errors.push("Review de alinhamento falhou.");
  }

  const copy = await requestJson<{ copy_variants: string[] }>({
    baseUrl: input.baseUrl,
    path: "/api/content/create",
    method: "POST",
    headers: {
      "x-admin-token": input.adminToken,
    },
    body: {
      session_id: sessionId,
      objective: "Roteiro de video para topo de funil",
      format: "instagram_reel",
      constraints: ["sem hype", "tom racional"],
    },
  });

  if (copy.status !== 200 || (copy.data.copy_variants?.length ?? 0) < 3) {
    errors.push("Criacao de copy nao retornou variantes suficientes.");
  }

  return {
    pilot: input.pilot,
    sessionId,
    token,
    onboardingCompleted,
    docGenerated,
    reviewScore: review.data.alignment_score ?? 0,
    copyVariants: copy.data.copy_variants?.length ?? 0,
    errors,
  };
}

function renderReport(input: {
  startedAt: string;
  finishedAt: string;
  baseUrl: string;
  results: PilotRun[];
}) {
  const failed = input.results.filter((result) => result.errors.length > 0);
  const passed = input.results.length - failed.length;

  const lines: string[] = [];
  lines.push("# UAT Pilot Report");
  lines.push("");
  lines.push(`- Base URL: ${input.baseUrl}`);
  lines.push(`- Started: ${input.startedAt}`);
  lines.push(`- Finished: ${input.finishedAt}`);
  lines.push(`- Passed pilots: ${passed}/${input.results.length}`);
  lines.push("");
  lines.push("| Pilot | Session | Onboarding | Documents | Review Score | Copy Variants | Status |");
  lines.push("|---|---|---|---|---:|---:|---|");

  for (const result of input.results) {
    lines.push(
      `| ${result.pilot} | ${result.sessionId || "-"} | ${result.onboardingCompleted ? "ok" : "fail"} | ${result.docGenerated ? "ok" : "fail"} | ${result.reviewScore.toFixed(1)} | ${result.copyVariants} | ${result.errors.length === 0 ? "PASS" : "FAIL"} |`,
    );
  }

  lines.push("");
  lines.push("## Detalhes de falhas");
  lines.push("");
  if (failed.length === 0) {
    lines.push("Sem falhas.");
  } else {
    for (const result of failed) {
      lines.push(`### Pilot ${result.pilot}`);
      for (const error of result.errors) {
        lines.push(`- ${error}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

async function main() {
  const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";
  const adminToken = process.env.ADMIN_API_TOKEN ?? "dev-admin-token";
  const pilots = Number(process.env.UAT_PILOTS ?? "3");

  const startedAt = new Date().toISOString();
  const results: PilotRun[] = [];

  for (let pilot = 1; pilot <= pilots; pilot += 1) {
    const run = await runPilot({
      pilot,
      baseUrl,
      adminToken,
    });
    results.push(run);
    console.log(`[pilot ${pilot}] ${run.errors.length === 0 ? "PASS" : "FAIL"}`);
  }

  const finishedAt = new Date().toISOString();
  const report = renderReport({
    startedAt,
    finishedAt,
    baseUrl,
    results,
  });

  const reportsDir = join(process.cwd(), "reports", "uat");
  await mkdir(reportsDir, { recursive: true });

  const reportPath = join(reportsDir, `uat-report-${new Date().toISOString().replace(/[:.]/g, "-")}.md`);
  await writeFile(reportPath, report, "utf8");

  const failures = results.flatMap((result) => result.errors);
  if (failures.length > 0) {
    console.error(`UAT concluido com falhas. Relatorio: ${reportPath}`);
    process.exit(1);
  }

  console.log(`UAT concluido com sucesso. Relatorio: ${reportPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
