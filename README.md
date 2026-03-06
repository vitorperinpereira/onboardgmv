# GMV Onboarding Platform

Web app interno para onboarding estrategico + ecossistema de agentes.

## Stack

- Next.js App Router + TypeScript
- Supabase Postgres
- LangChain + LangGraph
- BullMQ + Redis
- Docker Compose

## Rodar localmente

```bash
cp .env.example .env
npm ci
npm run dev
```

## Worker

```bash
npm run worker
```

O worker agora processa duas filas:
- `strategic-documents` (geracao estrategica)
- `ops-maintenance` (snapshot de metricas e manutencao de cache/observabilidade, sem IA)

## Docker

```bash
docker compose up --build
```

## Endpoints principais

- `POST /api/onboarding/session`
- `GET /api/onboarding/session/[token]`
- `POST /api/onboarding/answer`
- `POST /api/documents/generate`
- `GET /api/documents/[session_id]`
- `POST /api/content/review`
- `POST /api/content/create`
- `GET /api/admin/sessions`
- `GET /api/admin/metrics`
- `GET /api/health`

## Testes

```bash
npm run test
npm run test:e2e
```

## Operacao automatizada

```bash
# readiness de release (usa BASE_URL e ADMIN_API_TOKEN)
npm run ops:readiness

# uat automatizado de 3 pilotos (gera relatorio em reports/uat)
npm run uat:pilot

# monitoramento de hypercare (gera CSV em reports/hypercare)
npm run ops:hypercare
```

## Variaveis importantes

- `ADMIN_API_TOKEN` para rotas administrativas
- `OPENAI_API_KEY` para habilitar os agentes com LLM (fallback local quando ausente)
- `ENABLE_LLM_IN_TESTS=true` apenas se quiser rodar testes com chamadas reais ao LLM
- `REDIS_URL` para fila BullMQ (vazio = fallback sync na geracao)
- `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` para persistencia no Supabase
- `WORKER_CONCURRENCY` para throughput do worker
- `BASE_URL` para scripts operacionais (`ops:readiness`, `uat:pilot`, `ops:hypercare`)
- `HYPERCARE_MAX_API_P95_MS` e `HYPERCARE_MAX_API_ERROR_RATE` para alertas de latencia/erro no `ops:hypercare`

## Operacao

- Runbook: `docs/runbook-operacional.md`
- Readiness checklist: `docs/readiness-checklist.md`
- Rollback: `docs/rollback-plan.md`
- Hypercare: `docs/hypercare-playbook.md`
- UAT piloto: `docs/uat-plan.md`
