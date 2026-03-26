# Regras de Negócio: Adaptação de Atividades

## Tipos de Atividade

| Tipo | Chave | Contexto |
|------|-------|----------|
| Prova | `prova` | Avaliação formal |
| Exercício | `exercicio` | Prática em sala |
| Atividade de Casa | `atividade_casa` | Tarefa para casa |
| Trabalho | `trabalho` | Trabalho avaliativo |

**Restrição**: `activityType` deve ser um dos 4 valores acima. Seleção obrigatória antes de prosseguir.

## Wizard: Transições de Estado

| Step atual | Condição | Próximo step |
|-----------|----------|--------------|
| type (0) | activityType selecionado | content (1) |
| content (1) | activityText não vazio | barriers (2) — modo IA |
| content (1) | activityText não vazio | choice — modo manual (futuro) |
| barriers (2) | >= 1 barreira selecionada OU adaptForWholeClass = true | result (3) |
| result (3) | result != null (IA completou) | export (4) |
| export (4) | — | fim |

### Navegação Reversa

| Step atual | Ação ao voltar | Efeito colateral |
|-----------|---------------|------------------|
| result (3) → content (1) | Limpa result, contextPillars, questionImages | Alert de confirmação: "resultado da IA será descartado" |
| export (4) → result (3) | Nenhum | Mantém dados |
| barriers (2) → content (1) | Nenhum | Mantém seleções |

## Modos de Adaptação

### Modo IA (padrão)

| Regra | Detalhe |
|-------|---------|
| Resultado duplo | Sempre gera `version_universal` + `version_directed` |
| Streaming | Resposta via SSE (Server-Sent Events) |
| Formato | Pode retornar `StructuredActivity` (JSON) ou string legada |
| Fix automático | `fixStructuredResult()` corrige: questão `multiple_choice` sem alternatives vira `open_ended` |
| Regeneração | Questão individual pode ser regenerada via edge function |

### Modo Manual (planejado — Skip AI)

| Regra | Detalhe |
|-------|---------|
| Sem chamada IA | Nenhuma edge function de adaptação é invocada |
| Barreiras | Array vazio — não requer seleção |
| Conversão | `SelectedQuestion[]` → `StructuredActivity` via `convertToStructuredActivity()` |
| Justificativa | Fixa: "Atividade editada manualmente pelo professor." |
| Export | Usa mesmos pipelines de PDF/DOCX |

## Barreiras de Aprendizagem

11 dimensões, cada uma com 2-4 barreiras específicas:

| Dimensão | Chave | Barreiras |
|----------|-------|-----------|
| TEA | `tea` | abstração, comunicação social, sobrecarga sensorial, mudanças inesperadas |
| TDAH | `tdah` | atenção sustentada, impulsividade, organização |
| TOD | `tod` | resistência a regras, conflitos com autoridade |
| Síndrome de Down | `sindrome_down` | ritmo lento, memória curto prazo, abstração |
| Altas Habilidades | `altas_habilidades` | desmotivação, tédio |
| Dislexia | `dislexia` | leitura/interpretação, decodificação |
| Discalculia | `discalculia` | conceitos numéricos, operações |
| Disgrafia | `disgrafia` | escrita manual, organização espacial |
| Tourette | `tourette` | tiques, atenção |
| Dispraxia | `dispraxia` | coordenação motora, planejamento motor |
| TOC | `toc` | rituais compulsivos, perfeccionismo |

### Regras de Barreira por Aluno

| Regra | Testável como |
|-------|--------------|
| Barreiras carregadas do DB ficam "locked" (desabilitadas) | Checkbox disabled quando `is_active = true` vem do DB |
| Desbloquear exige confirmação via alert | Click em "desbloquear" dispara `window.confirm()` |
| Salvar barreiras faz DELETE + INSERT em `student_barriers` | Operação atômica no Supabase |
| Observação do aluno: max 2000 chars | Input limitado no componente |

## Tipos de Questão

| Tipo | Chave | Tem alternatives? | Tem blank_placeholder? |
|------|-------|--------------------|------------------------|
| Múltipla Escolha | `multiple_choice` | Sim (a-e) | Não |
| Dissertativa | `open_ended` | Não | Não |
| Completar Lacunas | `fill_blank` | Não | Sim |
| Verdadeiro/Falso | `true_false` | Não | Não |

**Restrição de validação**: Se `type = multiple_choice` e `alternatives` está vazio/undefined, `fixStructuredResult()` converte para `open_ended`.

## Métodos de Input

| Método | Fonte | Processamento |
|--------|-------|---------------|
| Manual (rich text) | Digitação no TipTap editor | Direto como `activityText` |
| Banco de Questões | Tabela `questions` | Formata como texto numerado |
| PDF upload | Arquivo .pdf | `parsePdf()` → texto + até 8 páginas como JPEG |
| DOCX upload | Arquivo .docx | `mammoth` → texto + imagens |
| Imagem (OCR) | JPEG/PNG | Edge function `extract-questions` |

### Limites de Upload

| Restrição | Valor |
|-----------|-------|
| PDF: max páginas processadas | 8 |
| PDF: max texto extraído | 8000 chars |
| Validação de arquivo | Magic bytes (PDF: `%PDF`, DOCX: `PK`, JPEG: `FF D8 FF`, PNG: `89 50 4E 47`) |

## Export

| Canal | Formato | Inclui |
|-------|---------|--------|
| Salvar histórico | JSON (Supabase) | result completo + question images |
| PDF | @react-pdf/renderer | Header, versões, estratégias, justificativa, dicas |
| DOCX | lib docx | Mesmo conteúdo, com LaTeX renderizado |
| Compartilhar | Token URL | Expira em 7 dias (calculado no frontend), sem autenticação |

**Restrição**: Deve salvar no histórico ANTES de poder compartilhar.

## Modelo de IA

| Funcionalidade | Modelo |
|---------------|--------|
| Adaptação (`adapt-activity`) | **Gemini Pro** |
| Regeneração de questão | Gemini 2.5 Flash |
| Extração de questões | Gemini 2.5 Flash |
| Geração de imagem | Gemini 2.5 Flash |
