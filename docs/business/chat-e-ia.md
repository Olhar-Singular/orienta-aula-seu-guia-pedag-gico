# Regras de Negócio: Chat e Uso de IA

## Chat Pedagógico

| Regra | Detalhe |
|-------|---------|
| Persistência | `chat_conversations` (título, user_id) + `chat_messages` (role, content) |
| Formatos de mensagem | String (texto puro) ou JSON array (multimodal com imagens) |
| Imagens | Base64 data URLs, suporte a paste-to-send |
| Streaming | Via `streamAI()` com SSE |
| Modelo | Gemini 2.5 Flash (fixo para chat) |

## Geração de Imagens para Questões

| Regra | Detalhe |
|-------|---------|
| Detecção automática | Regex para termos visuais: "figura", "imagem", "gráfico", etc. |
| Limite | Até 2 questões candidatas por adaptação |
| Mapeamento | Imagem associada ao número da questão (não ao ID) |
| Fallback | Se não consegue mapear, associa à primeira questão com pista visual |

## Banco de Questões

| Regra | Detalhe |
|-------|---------|
| Extração | De PDFs, DOCX, ou manual |
| Deduplicação | `normalizeTextForDedup()` + `findDuplicates()` |
| Campos | text, subject, topic, difficulty, options, correct_answer, resolution, image_url, is_public |
| Filtros | Por disciplina (subject) e dificuldade (difficulty) |

## Uso de IA (Admin)

| Métrica | Fonte |
|---------|-------|
| Ações rastreadas | adaptation, chat, barrier_analysis, question_extraction, pei_generation |
| Dados por log | school_id, user_id, action_type, model, tokens, cost, status |
| Filtros | Período (dia/semana/mês), modelo, tipo de ação |
| Precificação | Tabela `ai_model_pricing` (price_input_per_million, price_output_per_million) |

## Modelos por Funcionalidade

| Funcionalidade | Modelo | Nota |
|---------------|--------|------|
| Adaptação de atividades | Gemini Pro | Único que usa Pro |
| Chat pedagógico | Gemini 2.5 Flash | — |
| Extração de questões | Gemini 2.5 Flash | — |
| Análise de barreiras | Gemini 2.5 Flash | — |
| Geração de PEI | Gemini 2.5 Flash | — |

## Limites e Validações

| Restrição | Valor |
|-----------|-------|
| Quota de uso por escola/professor | **Sem limite** — uso ilimitado |
| Texto de atividade para IA | Sem limite explícito no frontend (PDF limitado a 8000 chars) |
| Streaming timeout | Controlado pela edge function (não pelo frontend) |
| Retry | Sem retry automático — usuário pode tentar novamente manualmente |
