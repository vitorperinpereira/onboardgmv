# Hypercare Playbook (5 dias uteis)

## Objetivo

Garantir estabilizacao pos-go-live com resposta rapida a incidentes, regressao funcional e problemas de qualidade de saida.

## Janela

- Dia 1 a Dia 5 apos release de producao
- Monitoramento ativo durante horario comercial estendido

## Rotina diaria

1. Revisar erros 5xx e falhas de job.
2. Revisar taxa de conclusao de onboarding e tempo medio de geracao.
3. Revisar tickets internos e classificar por severidade.
4. Aplicar hotfix para incidentes severos no mesmo dia.

## Severidade

- `SEV-1`: indisponibilidade do onboarding ou falha geral de API admin.
- `SEV-2`: degradacao severa de geracao/review/copy.
- `SEV-3`: problemas pontuais sem impacto amplo.

## SLAs de resposta

- `SEV-1`: inicio de atuacao em ate 15 min
- `SEV-2`: inicio de atuacao em ate 1h
- `SEV-3`: tratamento no ciclo diario

## Criterio de saida do hypercare

- 5 dias sem incidente `SEV-1`
- fila sem backlog sustentado
- taxa de erro de API dentro do baseline
- latencia p95 de endpoints criticos dentro da meta
- backlog critico zerado ou com plano fechado

## Automacao sugerida

```bash
# gera serie temporal CSV em reports/hypercare
npm run ops:hypercare
```

Variaveis uteis para alerta no script:

- `HYPERCARE_MAX_WAITING` (default `25`)
- `HYPERCARE_MAX_FAILED` (default `0`)
- `HYPERCARE_MAX_API_P95_MS` (default `2000`)
- `HYPERCARE_MAX_API_ERROR_RATE` (default `0.05`)
