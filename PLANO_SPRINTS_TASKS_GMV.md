# PLANO_SPRINTS_TASKS_GMV

## Status de implementacao

Este repositório contem a implementacao inicial das frentes definidas no plano de execucao:

- Bootstrap Next.js + TypeScript + lint/test base
- Estrutura de pastas por dominio (`src/agents`, `src/graph`, `src/services`, `src/app/api`)
- Modelo de dados e migracao Supabase
- RLS base para service role
- Endpoints principais do PRD
- Worker assíncrono BullMQ + Redis
- Docker Compose (`web`, `worker`, `redis`, `reverse-proxy`)
- CI pipeline (lint, test, build)
- UI onboarding (stepper 6 etapas)
- UI admin (sessoes, gerar documentos, review, create copy)

## Endpoints implementados

- `POST /api/onboarding/session`
- `GET /api/onboarding/session/[token]`
- `POST /api/onboarding/answer`
- `POST /api/documents/generate`
- `GET /api/documents/[session_id]`
- `POST /api/content/review`
- `POST /api/content/create`
- `GET /api/admin/sessions`
- `GET /api/health`

## Sprints e tasks (Jira-ready)

### Sprint 1 — Fundacao

- [x] GMV-S1-T01 Bootstrap Next.js + TS + lint/test
- [x] GMV-S1-T02 Estrutura base de pastas
- [x] GMV-S1-T03 Migracao SQL inicial
- [x] GMV-S1-T04 Indices e constraints
- [x] GMV-S1-T05 RLS base (service role)
- [x] GMV-S1-T06 Auth admin por token e sessao por token UUID
- [x] GMV-S1-T07 Docker Compose (web/worker/redis/proxy)
- [x] GMV-S1-T08 CI/CD base (pipeline de validacao)
- [x] GMV-S1-T09 Healthcheck e logging base
- [x] GMV-S1-T10 Suite inicial de testes unit/integracao

### Sprint 2 — Onboarding + EvaluateSpecificity

- [x] GMV-S2-T01 Stepper de onboarding 6 etapas
- [x] GMV-S2-T02 API de criacao e consulta de sessao
- [x] GMV-S2-T03 API de envio de resposta com Zod
- [x] GMV-S2-T04 EvaluateSpecificityAgent
- [x] GMV-S2-T05 Follow-up automatico para score < 7
- [x] GMV-S2-T06 Persistencia de responses/messages
- [x] GMV-S2-T07 Suporte a respostas parciais/retomada
- [x] GMV-S2-T08 Painel admin de sessoes
- [x] GMV-S2-T09 E2E full onboarding em CI
- [x] GMV-S2-T10 Validacao basica de input e auth

### Sprint 3 — Manifesto + Guia Editorial

- [x] GMV-S3-T01 Grafo estrategico (LangGraph)
- [x] GMV-S3-T02 Fila assíncrona BullMQ + worker
- [x] GMV-S3-T03 ManifestoAgent com guardrails
- [x] GMV-S3-T04 EditorialGuideAgent
- [x] GMV-S3-T05 Frameworks + diagnostico interno
- [x] GMV-S3-T06 Persistencia strategic_documents
- [x] GMV-S3-T07 Endpoint generate com modo queue/sync
- [x] GMV-S3-T08 UI admin para visualizar documentos
- [x] GMV-S3-T09 Testes de integracao E2E do pipeline completo
- [x] GMV-S3-T10 Dashboard operacional de jobs

### Sprint 4 — Alignment Review

- [x] GMV-S4-T01 Endpoint review
- [x] GMV-S4-T02 AlignmentReviewAgent
- [x] GMV-S4-T03 Rubrica inicial com palavras proibidas
- [x] GMV-S4-T04 Persistencia content_reviews
- [x] GMV-S4-T05 UI review no painel admin
- [x] GMV-S4-T06 Estrutura para retry assíncrono via queue
- [x] GMV-S4-T07 Suite de contrato/regrssao dedicada
- [x] GMV-S4-T08 Dataset de qualidade de review
- [x] GMV-S4-T09 Hardening de seguranca avancado

### Sprint 5 — Copy Creation + Go-live

- [x] GMV-S5-T01 Endpoint create
- [x] GMV-S5-T02 CopyCreationAgent
- [x] GMV-S5-T03 UI de geracao de copy
- [x] GMV-S5-T04 Rastreabilidade (copy_generations)
- [x] GMV-S5-T05 Guardrails finais (forbidden words)
- [x] GMV-S5-T06 Tuning de performance (p95 + cache + concorrencia)
- [x] GMV-S5-T07 UAT com clientes piloto (plano em `docs/uat-plan.md` + automacao em `npm run uat:pilot`)
- [x] GMV-S5-T08 Runbooks operacionais completos
- [x] GMV-S5-T09 Plano completo de readiness/rollback
- [x] GMV-S5-T10 Go-live + hypercare (playbook em `docs/hypercare-playbook.md` + monitor em `npm run ops:hypercare`)

## Arquivos-chave implementados

- `src/app/api/*` (todas as rotas principais)
- `src/agents/*` (agentes de especificidade, manifesto, editorial, review, copy)
- `src/graph/strategicGraph.ts`
- `src/services/*` (onboarding, documentos, conteudo, auth, queue)
- `src/worker/index.ts`
- `supabase/migrations/202602250001_init.sql`
- `docker-compose.yml`, `Dockerfile`, `Dockerfile.worker`, `nginx/nginx.conf`
- `.github/workflows/ci.yml`

## Pendencias para fechamento de producao

1. Configurar Supabase real (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) e aplicar migracoes.
2. Configurar `OPENAI_API_KEY` e calibrar prompts/saidas para uso real de LLM.
3. Configurar `REDIS_URL` de producao e validar worker com carga.
4. Executar suite E2E/contrato em ambiente staging com Supabase e Redis reais.
5. Executar UAT com 3 clientes piloto (roteiro em `docs/uat-plan.md`).
6. Executar go-live + hypercare de 5 dias uteis (playbook em `docs/hypercare-playbook.md`).
