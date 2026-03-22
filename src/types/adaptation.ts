// Tipos de questão suportados
export type QuestionType = 'multiple_choice' | 'open_ended' | 'fill_blank' | 'true_false';

// Alternativa para múltipla escolha
export interface Alternative {
  letter: string;        // 'a', 'b', 'c', 'd', 'e'
  text: string;          // Texto da alternativa (pode conter LaTeX)
  is_correct?: boolean;  // Opcional: para gabarito
}

// Questão individual
export interface StructuredQuestion {
  number: number;                 // 1, 2, 3...
  type: QuestionType;             // Tipo da questão
  statement: string;              // Enunciado (pode conter LaTeX)
  instruction?: string;           // Instrução antes da questão
  alternatives?: Alternative[];   // Para multiple_choice
  blank_placeholder?: string;     // Para fill_blank
  scaffolding?: string[];         // Passos de apoio DUA
  images?: string[];              // URLs de imagens da questão
}

// Seção da atividade
export interface ActivitySection {
  title?: string;                 // Título da seção (ex: "Parte 1 - Frações")
  introduction?: string;          // Texto introdutório da seção
  questions: StructuredQuestion[];
}

// Atividade completa estruturada
export interface StructuredActivity {
  sections: ActivitySection[];
  general_instructions?: string;
  visual_supports?: string[];
}

// Resultado da adaptação (retorno da IA)
export interface StructuredAdaptationResult {
  version_universal: StructuredActivity;
  version_directed: StructuredActivity;
  strategies_applied: string[];
  pedagogical_justification: string;
  implementation_tips: string[];
}

// Type guard
export function isStructuredActivity(data: unknown): data is StructuredActivity {
  return (
    typeof data === 'object' &&
    data !== null &&
    'sections' in data &&
    Array.isArray((data as any).sections)
  );
}

// Question type labels
export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: 'Múltipla Escolha',
  open_ended: 'Dissertativa',
  fill_blank: 'Completar Lacunas',
  true_false: 'Verdadeiro ou Falso',
};
