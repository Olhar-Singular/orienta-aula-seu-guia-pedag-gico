import { vi } from "vitest";
import type { AdaptationResult } from "@/components/adaptation/AdaptationWizard";

// ─── User fixtures ───
export const MOCK_USER = {
  id: "user-001",
  email: "professor@escola.com.br",
  user_metadata: { name: "Maria Silva" },
};

export const MOCK_SESSION = {
  access_token: "mock-access-token",
  user: MOCK_USER,
};

// ─── Profile fixtures ───
export const MOCK_PROFILE = {
  id: "profile-001",
  user_id: MOCK_USER.id,
  name: "Maria Silva",
  display_name: "Maria",
  email: MOCK_USER.email,
  role: "teacher",
  school_name: "Escola Municipal Exemplo",
  education_level: "fundamental_2",
  main_subject: "Matemática",
  onboarding_completed: true,
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
};

// ─── Class fixtures ───
export const MOCK_CLASS = {
  id: "class-001",
  name: "5º Ano A",
  description: "Turma do quinto ano",
  school_year: "2026",
  teacher_id: MOCK_USER.id,
  created_at: "2025-06-01T00:00:00Z",
  updated_at: "2025-06-01T00:00:00Z",
};

export const MOCK_CLASSES = [MOCK_CLASS];

// ─── Student fixtures ───
export const MOCK_STUDENT = {
  id: "student-001",
  name: "João Pedro",
  class_id: MOCK_CLASS.id,
  notes: "Aluno com TDAH",
  registration_code: "JP001",
  created_at: "2025-06-01T00:00:00Z",
};

export const MOCK_STUDENTS = [MOCK_STUDENT];

// ─── Student barriers fixtures ───
export const MOCK_STUDENT_BARRIERS = [
  { barrier_key: "tea_abstracao", dimension: "tea", is_active: true, notes: "Necessita fragmentação", student_id: MOCK_STUDENT.id },
  { barrier_key: "tdah_atencao_sustentada", dimension: "tdah", is_active: true, notes: null, student_id: MOCK_STUDENT.id },
  { barrier_key: "dislexia_leitura", dimension: "dislexia", is_active: true, notes: "15min extra", student_id: MOCK_STUDENT.id },
];

// ─── Adaptation result fixtures ───
export const MOCK_ADAPTATION_RESULT: AdaptationResult = {
  version_universal: "Versão Universal: Resolva as questões abaixo. Cada questão possui opções de resposta.\n\n1) Quanto é 2 + 3?\na) 4\nb) 5 ✓\nc) 6",
  version_directed: "Versão Dirigida para João Pedro:\n\n📝 Questão 1: Veja a imagem abaixo.\nQuanto é 2 + 3?\n➡️ Dica: conte nos dedos.\na) 4\nb) 5 ✓\nc) 6",
  strategies_applied: [
    "Fragmentação de enunciados",
    "Apoio visual com ícones",
    "Simplificação lexical",
    "Tempo estendido",
  ],
  pedagogical_justification:
    "As adaptações focam em remover barreiras de processamento e atenção, usando fragmentação e apoio visual para facilitar a compreensão.",
  implementation_tips: [
    "Leia o enunciado em voz alta antes de iniciar",
    "Permita uso de material concreto",
    "Ofereça 15 minutos adicionais",
  ],
};

// ─── Adaptation history fixture ───
export const MOCK_ADAPTATION_HISTORY = {
  id: "adapt-001",
  teacher_id: MOCK_USER.id,
  original_activity: "Resolva: 2 + 3 = ?",
  activity_type: "exercicio",
  barriers_used: MOCK_STUDENT_BARRIERS.map((b) => ({ dimension: b.dimension, barrier_key: b.barrier_key })),
  adaptation_result: MOCK_ADAPTATION_RESULT as any,
  student_id: MOCK_STUDENT.id,
  class_id: MOCK_CLASS.id,
  model_used: "gemini-2.5-flash",
  tokens_used: 450,
  created_at: "2026-03-14T10:00:00Z",
};

// ─── Question bank fixtures ───
export const MOCK_QUESTION = {
  id: "q-001",
  text: "Quanto é 2 + 2?",
  subject: "Matemática",
  topic: "Aritmética",
  difficulty: "facil",
  options: ["3", "4", "5", "6"],
  correct_answer: 1,
  resolution: "2 + 2 = 4",
  image_url: null,
  is_public: false,
  school_id: null,
  source: "manual",
  source_file_name: null,
  created_by: MOCK_USER.id,
  created_at: "2026-03-14T10:00:00Z",
  updated_at: "2026-03-14T10:00:00Z",
};

export const MOCK_QUESTIONS = [MOCK_QUESTION];

// ─── Barrier analysis fixtures ───
export const MOCK_BARRIER_ANALYSIS = {
  barriers: [
    { dimension: "processamento", barrier_key: "p1", label: "Enunciado longo e complexo", severity: "alta" as const, mitigation: "Fragmentar o enunciado em frases curtas" },
    { dimension: "atencao", barrier_key: "a1", label: "Muitos elementos visuais concorrentes", severity: "media" as const, mitigation: "Reduzir estímulos visuais" },
    { dimension: "expressao", barrier_key: "e1", label: "Exige resposta escrita longa", severity: "baixa" as const, mitigation: "Oferecer alternativas de resposta" },
  ],
  summary: "A atividade apresenta 3 barreiras, com maior concentração em processamento.",
};

// ─── Mock activity texts ───
export const MOCK_ACTIVITY_TEXT = `Leia o texto abaixo e responda as questões de 1 a 5.

O ciclo da água é o processo contínuo de circulação da água na natureza. A água evapora dos oceanos, rios e lagos, forma nuvens na atmosfera e retorna à superfície na forma de chuva, neve ou granizo.

1) O que é o ciclo da água?
a) Um processo de purificação
b) A circulação contínua da água na natureza
c) A transformação da água em gelo

2) De onde a água evapora principalmente?
a) Das montanhas
b) Dos oceanos, rios e lagos
c) Das florestas`;

// ─── Extracted questions from PDF ───
export const MOCK_EXTRACTED_QUESTIONS = [
  { text: "O que é o ciclo da água?", subject: "Ciências", options: ["Um processo de purificação", "A circulação contínua da água na natureza", "A transformação da água em gelo"], correct_answer: 1 },
  { text: "De onde a água evapora principalmente?", subject: "Ciências", options: ["Das montanhas", "Dos oceanos, rios e lagos", "Das florestas"], correct_answer: 1 },
];
