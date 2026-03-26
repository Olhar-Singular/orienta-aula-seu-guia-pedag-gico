# Glossário do Domínio

## Termos Pedagógicos

| Termo | Definição | Onde aparece |
|-------|-----------|-------------|
| **DUA** | Design Universal para Aprendizagem — framework pedagógico que guia as adaptações | Adaptações universais, scaffolding |
| **PEI** | Plano Educacional Individualizado — documento com objetivos e estratégias por aluno | `student_pei` table, relatórios |
| **Barreira de aprendizagem** | Obstáculo que dificulta o acesso do aluno ao conteúdo | `student_barriers`, `barriers.ts` |
| **Adaptação universal** | Versão da atividade acessível a todos os alunos (baseada em DUA) | `version_universal` |
| **Adaptação dirigida** | Versão específica para um aluno com barreiras identificadas | `version_directed` |
| **Scaffolding** | Passos de apoio graduais para ajudar o aluno a resolver a questão | `StructuredQuestion.scaffolding[]` |
| **Fragmentação** | Quebrar enunciados longos em partes menores | Estratégia de adaptação |
| **Apoio visual** | Uso de ícones, imagens e formatação para facilitar compreensão | Estratégia de adaptação |
| **Simplificação lexical** | Trocar palavras complexas por mais simples | Estratégia de adaptação |

## Dimensões de Barreira

| Sigla | Nome completo | Chave no código |
|-------|--------------|-----------------|
| **TEA** | Transtorno do Espectro Autista | `tea` |
| **TDAH** | Transtorno do Déficit de Atenção e Hiperatividade | `tdah` |
| **TOD** | Transtorno Opositivo-Desafiador | `tod` |
| **TOC** | Transtorno Obsessivo-Compulsivo | `toc` |

## Termos da Aplicação

| Termo | Definição | Código |
|-------|-----------|--------|
| **Wizard** | Fluxo multi-step de adaptação (5 etapas) | `AdaptationWizard.tsx` |
| **ActivityType** | Tipo de atividade: prova, exercício, atividade_casa, trabalho | `activityType` prop |
| **QuestionType** | Tipo de questão: múltipla escolha, dissertativa, lacunas, V/F | `StructuredQuestion.type` |
| **SelectedQuestion** | Questão escolhida do banco para adaptação | `WizardData.selectedQuestions[]` |
| **WizardData** | Objeto de estado completo do wizard | State no `AdaptationWizard` |
| **AdaptationResult** | Retorno da IA com ambas versões + estratégias + justificativa | `WizardData.result` |
| **ContextPillars** | Pilares de contexto pedagógico para a adaptação | `WizardData.contextPillars` |
| **Share token** | Token de 24 chars para compartilhar adaptação sem auth | `shared_adaptations.token` |
| **Edge function** | Função serverless no Supabase (Deno runtime) | `supabase/functions/` |
| **Barrier lock** | Estado onde barreiras carregadas do DB ficam desabilitadas | UI de `StepBarrierSelection` |

## Termos de Infraestrutura

| Termo | Definição |
|-------|-----------|
| **Anon key** | Chave pública do Supabase para requests client-side |
| **SSE** | Server-Sent Events — protocolo de streaming usado pela IA |
| **Magic bytes** | Primeiros bytes de um arquivo que identificam seu formato real |
| **Fork pool** | Modo do Vitest que usa processos (não threads) para isolamento de memória |
