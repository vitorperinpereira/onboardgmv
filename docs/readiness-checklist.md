# Readiness Checklist - Producao

## Infra e deploy

- [ ] VPS com Docker e Docker Compose atualizados
- [ ] DNS e proxy configurados
- [ ] Certificado TLS ativo (se aplicavel)
- [ ] Pipeline CI/CD validado

## Seguranca

- [ ] `ADMIN_API_TOKEN` rotacionado para valor forte
- [ ] `OPENAI_API_KEY` apenas server-side
- [ ] `SUPABASE_SERVICE_ROLE_KEY` protegida em secret manager
- [ ] Headers de seguranca ativos
- [ ] Rate limit validado em endpoints publicos e admin

## Banco e fila

- [ ] Migracoes Supabase aplicadas
- [ ] Indices e constraints verificados
- [ ] RLS ativa e testada
- [ ] Redis com persistencia habilitada

## Qualidade

- [ ] `npm run lint` verde
- [ ] `npm run test` verde
- [ ] `npm run build` verde
- [ ] `npm run test:e2e` verde em staging

## Observabilidade

- [ ] Dashboard de metricas operacionais ativo
- [ ] Alertas para 5xx, falha de job e latencia p95 configurados
- [ ] Logs centralizados e consultaveis

## Go-live gate

- [ ] Smoke test funcional em staging
- [ ] Janela de release aprovada
- [ ] Plano de rollback documentado
- [ ] Responsavel de plantao definido

## Automacao sugerida

```bash
# usa BASE_URL e ADMIN_API_TOKEN
npm run ops:readiness
```
