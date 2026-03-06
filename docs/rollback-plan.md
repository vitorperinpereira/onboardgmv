# Rollback Plan - GMV Onboarding

## Objetivo

Reverter rapidamente para a versao estavel anterior em caso de incidente critico apos deploy.

## Gatilhos de rollback

- Erro 5xx sustentado acima do baseline por 15 minutos
- Fila com falha sistemica de processamento
- Quebra de fluxo critico (onboarding ou rotas admin)

## Procedimento

1. Identificar ultimo release estavel no registro de deploy.
2. Atualizar imagem/tag no `docker-compose.yml` ou variavel de release.
3. Executar `docker compose up -d` com versao anterior.
4. Validar smoke tests:
   - `GET /api/health`
   - `POST /api/onboarding/session`
   - `GET /api/admin/sessions` (com token)
5. Comunicar rollback e abrir postmortem.

## Dados

- Nao executar rollback de schema destrutivo sem plano de compatibilidade.
- Manter migrations backward-compatible sempre que possivel.

## Responsaveis

- Owner tecnico de plantao
- Apoio de backend + devops
