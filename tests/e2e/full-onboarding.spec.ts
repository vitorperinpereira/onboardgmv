import { expect, test } from "@playwright/test";

test("full onboarding flow with strategic outputs", async ({ request }) => {
  const created = await request.post("/api/onboarding/session", {
    data: {
      client_name: "Isabella Operacoes",
      clinic_name: "GMV Clinic",
      email: "isa@gmv.com",
    },
  });

  expect(created.ok()).toBeTruthy();
  const session = await created.json();

  const genericAttempt = await request.post("/api/onboarding/answer", {
    data: {
      token: session.token,
      step: "essencia",
      answers: {
        response: "Somos diferenciados e inovadores",
      },
    },
  });

  expect(genericAttempt.ok()).toBeTruthy();
  const genericPayload = await genericAttempt.json();
  expect(genericPayload.accepted).toBeFalsy();
  expect(genericPayload.followups.length).toBeGreaterThan(0);

  const answers = [
    {
      step: "essencia",
      response:
        "Por exemplo, nos ultimos 12 meses atendemos 248 pacientes de tricologia, com 39% de retorno em 90 dias e ticket medio de R$ 1.820.",
    },
    {
      step: "posicionamento",
      response:
        "Nossa posicao e de medicina capilar orientada por evidencia: 3 protocolos com indicadores de adesao acima de 78% em 2025.",
    },
    {
      step: "publico",
      response:
        "Atendemos adultos de 28 a 52 anos com queda cronica, em sua maioria profissionais urbanos, com dor principal de perda de confianca e tempo.",
    },
    {
      step: "prova",
      response:
        "Temos base de 137 casos auditados, com melhora percebida por escala fotografica em 71% dos casos apos 120 dias de protocolo.",
    },
    {
      step: "personalidade",
      response:
        "Comunicamos de forma direta e calma, sem urgencia artificial. Em auditoria interna, 92% das pecas mantiveram tom tecnico e empatico.",
    },
    {
      step: "futuro",
      response:
        "Nos proximos 18 meses, meta de ampliar a linha preventiva para elevar em 22% a recorrencia, sem reduzir qualidade de diagnostico inicial.",
    },
  ] as const;

  for (const answer of answers) {
    const res = await request.post("/api/onboarding/answer", {
      data: {
        token: session.token,
        step: answer.step,
        answers: {
          response: answer.response,
        },
      },
    });

    expect(res.ok()).toBeTruthy();
    const payload = await res.json();
    expect(payload.accepted).toBeTruthy();
    expect(payload.specificity_score).toBeGreaterThanOrEqual(7);
  }

  const generate = await request.post("/api/documents/generate", {
    headers: {
      "x-admin-token": "dev-admin-token",
    },
    data: {
      session_id: session.session_id,
    },
  });

  expect(generate.ok()).toBeTruthy();

  const docs = await request.get(`/api/documents/${session.session_id}`, {
    headers: {
      "x-admin-token": "dev-admin-token",
    },
  });

  expect(docs.ok()).toBeTruthy();
  const docsPayload = await docs.json();
  expect(typeof docsPayload.manifesto).toBe("string");
  expect(docsPayload.editorial_guide).toBeTruthy();

  const review = await request.post("/api/content/review", {
    headers: {
      "x-admin-token": "dev-admin-token",
    },
    data: {
      session_id: session.session_id,
      content_submitted:
        "Por exemplo, nos ultimos 4 meses acompanhamos 82 pacientes com protocolo progressivo e taxa de continuidade de 67%.",
    },
  });

  expect(review.ok()).toBeTruthy();
  const reviewPayload = await review.json();
  expect(typeof reviewPayload.alignment_score).toBe("number");

  const copy = await request.post("/api/content/create", {
    headers: {
      "x-admin-token": "dev-admin-token",
    },
    data: {
      session_id: session.session_id,
      objective: "Gerar roteiro de video para topo de funil",
      format: "instagram_reel",
      constraints: ["tom racional", "evitar promessas absolutas"],
    },
  });

  expect(copy.ok()).toBeTruthy();
  const copyPayload = await copy.json();
  expect(copyPayload.copy_variants.length).toBeGreaterThanOrEqual(3);
});
