import { beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { POST as createSessionRoute } from "@/app/api/onboarding/session/route";
import { POST as createCopyRoute } from "@/app/api/content/create/route";
import { POST as reviewRoute } from "@/app/api/content/review/route";
import { GET as getDocumentsRoute } from "@/app/api/documents/[session_id]/route";
import { resetRepository, setRepository } from "@/repositories";
import { InMemoryOnboardingRepository } from "@/repositories/inMemoryRepository";
import { createOnboardingSession, submitOnboardingAnswer } from "@/services/onboardingService";
import { generateStrategicDocuments } from "@/services/documentService";
import { resetRateLimitStore } from "@/services/rateLimit";

async function bootstrapCompletedSession() {
  const created = await createOnboardingSession({
    client_name: "Isa",
    clinic_name: "GMV",
    email: "isa@gmv.com",
  });

  const steps = [
    ["essencia", "Por exemplo, em 12 meses atendemos 248 pacientes com 39% de retorno e ticket medio de R$1.820."],
    ["posicionamento", "Nossa proposta e evidencial, com 3 protocolos auditados e adesao de 78% em 2025."],
    ["publico", "Publico de 28 a 52 anos, com queda cronica e necessidade de plano claro de tratamento."],
    ["prova", "Base com 137 casos, melhora observavel em 71% apos 120 dias e acompanhamento estruturado."],
    ["personalidade", "Tom tecnico e humano, sem urgencia artificial, mantendo consistencia em 92% das pecas."],
    ["futuro", "Meta de elevar recorrencia em 22% em 18 meses com manutencao de qualidade diagnostica."],
  ] as const;

  for (const [step, response] of steps) {
    await submitOnboardingAnswer({
      token: created.token,
      step,
      answers: { response },
    });
  }

  await generateStrategicDocuments(created.session_id);

  return created;
}

describe("API contract regression", () => {
  beforeEach(() => {
    resetRepository();
    setRepository(new InMemoryOnboardingRepository());
    resetRateLimitStore();
  });

  it("creates onboarding session with expected contract", async () => {
    const response = await createSessionRoute(
      new NextRequest("http://localhost/api/onboarding/session", {
        method: "POST",
        body: JSON.stringify({
          client_name: "Isabella",
          clinic_name: "GMV Clinic",
          email: "isa@gmv.com",
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.session_id).toBeTruthy();
    expect(body.token).toBeTruthy();
    expect(body.status).toBe("in_progress");
  });

  it("blocks admin-only routes without token", async () => {
    const response = await reviewRoute(
      new NextRequest("http://localhost/api/content/review", {
        method: "POST",
        body: JSON.stringify({
          session_id: randomUUID(),
          content_submitted: "Texto qualquer para validar autorizacao",
        }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("returns copy creation contract for completed session", async () => {
    const created = await bootstrapCompletedSession();

    const response = await createCopyRoute(
      new NextRequest("http://localhost/api/content/create", {
        method: "POST",
        headers: {
          "x-admin-token": "dev-admin-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          session_id: created.session_id,
          objective: "Criar roteiro de aquisicao",
          format: "video",
          constraints: ["sem hype"],
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(Array.isArray(body.copy_variants)).toBe(true);
    expect(body.copy_variants.length).toBeGreaterThanOrEqual(3);
    expect(typeof body.rationale).toBe("string");
  });

  it("returns 404 for unknown strategic document session", async () => {
    const response = await getDocumentsRoute(
      new NextRequest("http://localhost/api/documents/unknown", {
        headers: {
          "x-admin-token": "dev-admin-token",
        },
      }),
      {
        params: Promise.resolve({
          session_id: randomUUID(),
        }),
      },
    );

    expect(response.status).toBe(404);
  });
});
