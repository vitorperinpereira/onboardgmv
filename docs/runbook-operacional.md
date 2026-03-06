# Runbook Operacional - GMV Onboarding

## Objetivo

Orientar operacao diaria, troubleshooting e resposta a incidentes do sistema de onboarding estrategico.

## Componentes

- `web` (Next.js App Router)
- `worker` (BullMQ processor)
- `redis` (fila)
- `reverse-proxy` (nginx)
- Supabase externo (Postgres)

## Comandos de rotina

```bash
# subir stack
Docker compose up -d --build

# logs aplicacao web
Docker compose logs -f web

# logs worker
Docker compose logs -f worker

# status containers
Docker compose ps
```

## Sinais de saude

- `GET /api/health` retorna `status=ok`
- fila sem crescimento continuo em `waiting`
- taxa de erro 5xx baixa e sem picos sustentados

## Incidentes comuns

### Worker nao processa jobs

1. Verificar `REDIS_URL` no ambiente.
2. Verificar conectividade com Redis.
3. Reiniciar `worker`.
4. Confirmar se jobs estao acumulando em `waiting/failed`.

### Erro 401 em rotas admin

1. Confirmar `x-admin-token`.
2. Confirmar valor de `ADMIN_API_TOKEN` no ambiente alvo.
3. Garantir que proxy nao remove headers customizados.

### Falha de persistencia Supabase

1. Validar `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`.
2. Checar status do projeto Supabase.
3. Revisar politicas RLS e migrations aplicadas.

## Recovery rapido

1. Escalar para versao estavel anterior (rollback de deploy).
2. Preservar logs do periodo do incidente.
3. Rodar smoke test (`/api/health`, onboarding create, admin sessions).
4. Reabrir trafego total apenas apos estabilizacao.
