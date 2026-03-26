# Regras de Negócio: Alunos e Turmas

## Turmas

| Campo | Regra |
|-------|-------|
| Nome | Obrigatório, max 100 chars |
| Descrição | Opcional, max 200 chars |
| Ano letivo | Obrigatório, max 10 chars |
| Vínculo | `teacher_id` = professor criador |

### Operações

| Operação | Restrição |
|----------|-----------|
| Criar turma | Dados válidos + school_id do contexto |
| Editar turma | Apenas o professor dono |
| Deletar turma | Proibido se houver alunos vinculados — deve remover todos primeiro |

## Alunos

| Campo | Regra |
|-------|-------|
| Nome | Obrigatório |
| Matrícula (registration_code) | Opcional |
| Notas | Opcional, max 1000 chars |
| Vínculo | `class_id` = turma de origem |

### Cadastro via CSV

| Regra | Detalhe |
|-------|---------|
| Formato | Colunas: nome, matricula (separador: vírgula) |
| Header | Auto-detectado (se primeira linha contém "nome") |
| Linhas vazias | Ignoradas |
| Nome vazio | Gera erro: "Linha N: nome vazio." |
| Nenhum aluno | Gera erro: "Nenhum aluno encontrado no arquivo." |

## Barreiras do Aluno

| Regra | Testável como |
|-------|--------------|
| Cada aluno pode ter N barreiras ativas | `student_barriers` com `is_active = true` |
| Barreiras são das 11 dimensões definidas | `dimension` deve ser chave válida de `BARRIER_DIMENSIONS` |
| Salvar barreiras = DELETE all + INSERT new | Operação atômica — substitui todas de uma vez |
| Barreiras carregadas do DB iniciam "locked" | UI mostra checkboxes desabilitadas |
| Desbloquear exige confirmação | Alert: "Tem certeza que deseja editar as barreiras?" |

## PEI (Plano Educacional Individualizado)

| Campo | Tipo |
|-------|------|
| Perfil do aluno | Texto livre |
| Objetivos | Array de `{ id, area, description, deadline, status }` |
| Adaptações curriculares | Texto livre |
| Recursos e suporte | Texto livre |
| Estratégias pedagógicas | Texto livre |
| Cronograma de revisão | Texto livre |
| Notas adicionais | Texto livre |

### Status de Objetivo

| Status | Chave |
|--------|-------|
| Pendente | `pendente` |
| Em progresso | `em_progresso` |
| Atingida | `atingida` |

## Documentos do Aluno

| Campo | Regra |
|-------|-------|
| Tipo | Mesmo que `ActivityType`: prova, exercicio, atividade_casa, trabalho |
| Arquivo | URL armazenada em `file_url` |
| Vínculo | `student_id` |

## Relatórios

| Tipo | Dados incluídos |
|------|-----------------|
| Relatório do Aluno | Barreiras ativas, histórico de adaptações, PEI, documentos |
| Relatório da Turma | Frequência de barreiras (heatmap), timeline de adaptações |
