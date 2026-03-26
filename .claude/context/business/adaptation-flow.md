# Fluxo de Adaptação

## Wizard — 6 Steps

O wizard tem dois modos de operação. A escolha entre IA e Manual ocorre **após** a seleção do aluno e barreiras:

```
[1] Tipo       → [2] Conteúdo  → [3] Barreiras → [4] Modo     → [5] Resultado  → [6] Exportar
  prova/           texto/PDF/      aluno +           IA ou          IA: universal     PDF/DOCX/
  exercício/       DOCX/imagem/    barreiras          Manual         + dirigida        salvar/
  ativ. casa/      banco questões  (11 dimensões:                    Manual: editor    compartilhar
  trabalho                          TEA, TDAH, etc.)                 inline
```

## Fluxos

- **Fluxo IA**:     `type → content → barriers → choice → result → export`
- **Fluxo Manual**: `type → content → barriers → choice → editor → export`

O step `choice` existe em **ambas** as sequências no mesmo índice (3), permitindo trocar de modo sem perder o step index. Barreiras selecionadas são ignoradas no modo manual (decisão de produto).

## Tipos Estruturados

```typescript
StructuredActivity { sections: ActivitySection[] }
  └── ActivitySection { questions: StructuredQuestion[] }
       └── StructuredQuestion { type: QuestionType, statement, alternatives?, scaffolding? }

QuestionType = 'multiple_choice' | 'open_ended' | 'fill_blank' | 'true_false'
```

O resultado da IA retorna `version_universal` + `version_directed`, ambos usando `StructuredActivity` ou string legada.
