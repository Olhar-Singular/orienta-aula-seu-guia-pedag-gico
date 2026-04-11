// Fontes embutidas no @react-pdf/renderer (sem Font.register)
export type PdfFontFamily = "Helvetica" | "Courier" | "Times-Roman";

export type TextStyle = {
  fontSize?: number;              // pontos, default 11
  fontFamily?: PdfFontFamily;
  bold?: boolean;                 // default false
  italic?: boolean;               // default false
  textAlign?: "left" | "center" | "right" | "justify";
  lineHeight?: number;            // multiplicador, default 1.5
};

export const TEXT_STYLE_DEFAULTS: Required<TextStyle> = {
  fontSize: 11,
  fontFamily: "Helvetica",
  bold: false,
  italic: false,
  textAlign: "justify",
  lineHeight: 1.5,
};

export type ContentBlock =
  | { id: string; type: "text"; content: string; style?: TextStyle }
  | {
      id: string;
      type: "image";
      src: string;
      width: number;        // 0 a 1 (porcentagem da largura do conteudo)
      alignment: "left" | "center" | "right";
      caption?: string;
    }
  | { id: string; type: "page_break" };

export type ActivityHeader = {
  schoolName: string;
  subject: string;
  teacherName: string;
  className: string;
  date: string;
  showStudentLine: boolean;
  logoSrc?: string;
  logoWidth?: number;           // pontos, default 60
};

export type StylePreset = {
  id: string;
  name: string;
  description: string;
  textStyle: Required<TextStyle>;
  questionSpacing: number;
  alternativeIndent: number;
};

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: "formal",
    name: "Prova Formal",
    description: "Times 12pt, justificado, espacamento 1.5x",
    textStyle: { fontSize: 12, fontFamily: "Times-Roman", bold: false, italic: false, textAlign: "justify", lineHeight: 1.5 },
    questionSpacing: 24,
    alternativeIndent: 16,
  },
  {
    id: "light",
    name: "Atividade Leve",
    description: "Helvetica 11pt, alinhado a esquerda, espacamento 1.5x",
    textStyle: { fontSize: 11, fontFamily: "Helvetica", bold: false, italic: false, textAlign: "left", lineHeight: 1.5 },
    questionSpacing: 20,
    alternativeIndent: 12,
  },
  {
    id: "high-contrast",
    name: "Alto Contraste",
    description: "Helvetica 14pt, negrito, espacamento 2x",
    textStyle: { fontSize: 14, fontFamily: "Helvetica", bold: true, italic: false, textAlign: "left", lineHeight: 2 },
    questionSpacing: 32,
    alternativeIndent: 20,
  },
];

export type PdfLayoutConfig = {
  header: ActivityHeader;
  globalShowSeparators: boolean;
  questionLayouts: Record<string, {
    spacingAfter?: number;
    answerLines?: number;
    showSeparator?: boolean;
    alternativeIndent?: number;
    alternativeOrder?: number[];
  }>;
  contentOverrides: Record<string, ContentBlock[]>;
  presetId?: string;
};

// Tipos de questao suportados
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
  statement: string;              // Enunciado (pode conter LaTeX ou HTML)
  statementFormat?: 'text' | 'html';  // Formato do enunciado (default: text)
  instruction?: string;           // Instrução antes da questão
  alternatives?: Alternative[];   // Para multiple_choice
  blank_placeholder?: string;     // Para fill_blank
  scaffolding?: string[];         // Passos de apoio DUA
  images?: string[];              // URLs de imagens da questao (DEPRECATED: usar content)

  // Novo modelo: lista ordenada de blocos (texto, imagem, page_break)
  content?: ContentBlock[];

  // Campos de layout do PDF Preview Editor
  spacingAfter?: number;        // pontos extra apos a questao (default 20)
  answerLines?: number;         // linhas pontilhadas para resposta (0 = nenhuma)
  showSeparator?: boolean;      // linha horizontal antes da questao
  alternativeIndent?: number;   // pontos de recuo das alternativas (default 12)
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

// Questão selecionada do banco de questões
export type SelectedQuestion = {
  id: string;
  text: string;
  image_url: string | null;
  options: string[] | null;
  subject: string;
  topic: string | null;
  difficulty: string | null;
};

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
