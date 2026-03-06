# PRD --- Sistema de Onboarding Estratégico + Ecossistema de Agentes GMV

## 1. Visão Geral

### Objetivo

Construir um web app interno para onboarding estratégico de clientes GMV
que:

1.  Coleta informações estruturadas
2.  Interage quando respostas forem genéricas
3.  Gera:
    -   Manifesto
    -   Guia Editorial
    -   Frameworks
    -   Diagnóstico interno
4.  Permite:
    -   Avaliar alinhamento de roteiros/copys
    -   Gerar novas copys alinhadas ao posicionamento

Arquitetura baseada em: - Web App (Next.js) - Supabase (Postgres) -
Backend com LangChain + LangGraph - OpenAI como LLM - Orquestração por
grafo de agentes

------------------------------------------------------------------------

# 2. Arquitetura Geral

## 2.1 Componentes

### Frontend

-   Next.js (App Router)
-   React Stepper para onboarding
-   Painel interno (admin)

### Backend

-   API routes (Next.js)
-   Serviço de agentes (LangChain + LangGraph)
-   Worker assíncrono para geração de outputs

### Banco

Supabase (Postgres)

### LLM

OpenAI via LangChain

------------------------------------------------------------------------

# 3. Estrutura do Banco de Dados

## 3.1 Tabelas

### clients

-   id (uuid)
-   name
-   clinic_name
-   email
-   created_at

### onboarding_sessions

-   id
-   client_id
-   token
-   status (in_progress \| completed)
-   maturity_score
-   created_at
-   completed_at

### onboarding_responses

-   id
-   session_id
-   step
-   answers (jsonb)
-   specificity_score
-   is_partial
-   created_at

### onboarding_messages

-   id
-   session_id
-   step
-   role (user \| assistant \| system)
-   content
-   created_at

### strategic_documents

-   id
-   session_id
-   manifesto
-   manifesto_short
-   editorial_guide (jsonb)
-   frameworks (jsonb)
-   internal_diagnosis (jsonb)
-   created_at

### content_reviews

-   id
-   session_id
-   content_submitted
-   alignment_score
-   strengths
-   misalignments
-   justification
-   created_at

------------------------------------------------------------------------

# 4. Fluxo do Sistema

## 4.1 Onboarding

Etapas: 1. Essência 2. Posicionamento 3. Público 4. Prova 5.
Personalidade 6. Futuro

Cada etapa: - Recebe resposta - Envia para Agente Avaliador - Se
genérica → retorna follow-ups - Se específica → salva e libera próximo

------------------------------------------------------------------------

# 5. Arquitetura dos Agentes (LangChain + LangGraph)

Nodes: 1. EvaluateSpecificityAgent 2. ManifestoAgent 3.
EditorialGuideAgent 4. AlignmentReviewAgent 5. CopyCreationAgent

Edges: Onboarding → ManifestoAgent\
Manifesto → EditorialGuideAgent\
EditorialGuide → CopyCreationAgent\
ContentSubmitted → AlignmentReviewAgent

------------------------------------------------------------------------

# 6. Agentes Especificados

## 6.1 EvaluateSpecificityAgent

Função: Avaliar respostas do onboarding.

Input: - step - resposta atual - histórico da etapa

Output: { is_generic: boolean, specificity_score: number, followups:
\[\], why_generic: \[\] }

Lógica: - Detecta abstrações - Busca ausência de números, exemplos e
contexto real - Se score \< 7 → gerar followups

------------------------------------------------------------------------

## 6.2 ManifestoAgent

Função: Gerar manifesto estratégico.

Input: - respostas estruturadas do onboarding

Output: { manifesto_long, manifesto_short, positioning_statement }

Regras: - Proibido hype - Proibido "segredo", "hack", "fórmula" -
Provocação racional - Criar tensão estratégica

------------------------------------------------------------------------

## 6.3 EditorialGuideAgent

Função: Transformar manifesto em guia editorial estruturado.

Output: { voice, tone, rational_vs_emotional, pillars: \[\],
what_we_combat: \[\], forbidden_words: \[\], CTA_rules: \[\],
content_structure_pattern }

------------------------------------------------------------------------

## 6.4 AlignmentReviewAgent

Função: Revisar roteiros e copys.

Output: { alignment_score: 0-10, strengths: \[\], misalignments: \[\],
justification, suggestions: \[\] }

Critérios: - Coerência com posicionamento - Uso de palavras proibidas -
Tom correto - Estrutura compatível com guia

------------------------------------------------------------------------

## 6.5 CopyCreationAgent

Função: Criar copys com base em manifesto + guia editorial + frameworks.

Regras: - Não contradizer manifesto - Seguir estrutura padrão - Aplicar
pilares corretamente

------------------------------------------------------------------------

# 7. Estrutura do Projeto

/agents evaluate_specificity.py manifesto_agent.py editorial_agent.py
alignment_agent.py copy_agent.py

/graph strategic_graph.py

/services llm_provider.py

/api onboarding.py generate_documents.py review_content.py
create_copy.py

------------------------------------------------------------------------

# 8. Segurança

-   Chave OpenAI apenas server-side
-   Não enviar dados sensíveis desnecessários
-   Controle por sessão/token

------------------------------------------------------------------------

# 9. Roadmap

Fase 1: Banco + Onboarding + EvaluateSpecificityAgent\
Fase 2: Manifesto + Guia Editorial\
Fase 3: AlignmentReviewAgent\
Fase 4: CopyCreationAgent

------------------------------------------------------------------------

# 10. Resultado Esperado

Sistema que: - Entrevista cliente - Corrige superficialidade - Gera
identidade estratégica - Valida comunicação - Cria conteúdo coerente -
Armazena histórico - Escala para múltiplos clientes
