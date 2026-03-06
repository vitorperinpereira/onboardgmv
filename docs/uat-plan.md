# UAT Plan - Piloto Interno

## Escopo

Validar onboarding, geracao documental, review de alinhamento e criacao de copy com 3 clientes piloto internos.

## Roteiro

1. Criar sessao e concluir 6 etapas.
2. Confirmar follow-up em resposta generica.
3. Gerar manifesto e guia editorial.
4. Revisar uma copy alinhada e uma desalinhada.
5. Gerar 3 variantes de copy com restricoes.

## Criterios de aprovacao

- Fluxos principais sem erro bloqueante.
- Score de review coerente com qualidade percebida.
- Variantes de copy aderentes ao posicionamento.
- Equipe interna aprova usabilidade minima do painel.

## Registro

- Registrar feedback em planilha/ticket por caso.
- Classificar em: blocker, high, medium, low.
- Definir owner e prazo para correcoes.

## Automacao sugerida

```bash
# executa 3 pilotos automatizados e gera relatorio
npm run uat:pilot
```

Relatorio gerado em `reports/uat/`.
