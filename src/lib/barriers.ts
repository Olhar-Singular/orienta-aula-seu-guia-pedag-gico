export type BarrierDimension = {
  key: string;
  label: string;
  barriers: { key: string; label: string }[];
};

export const BARRIER_DIMENSIONS: BarrierDimension[] = [
  {
    key: "processamento",
    label: "Processamento",
    barriers: [
      { key: "proc_enunciados_longos", label: "Dificuldade para compreender enunciados longos" },
      { key: "proc_conceitos_semelhantes", label: "Confunde conceitos semelhantes" },
      { key: "proc_exemplos_concretos", label: "Precisa de exemplos concretos para entender abstrações" },
      { key: "proc_multiplos_passos", label: "Dificuldade com sequências de múltiplos passos" },
    ],
  },
  {
    key: "atencao",
    label: "Atenção",
    barriers: [
      { key: "aten_foco_atividades_longas", label: "Perde o foco em atividades longas" },
      { key: "aten_estimulos_ambiente", label: "Distrai-se com estímulos do ambiente" },
      { key: "aten_retomar_tarefa", label: "Dificuldade para retomar tarefa após interrupção" },
      { key: "aten_lembretes_constantes", label: "Precisa de lembretes constantes" },
    ],
  },
  {
    key: "ritmo",
    label: "Ritmo",
    barriers: [
      { key: "ritmo_mais_tempo", label: "Precisa de mais tempo que os colegas" },
      { key: "ritmo_muito_rapido", label: "Termina muito rápido (sem conferir)" },
      { key: "ritmo_prazos_curtos", label: "Dificuldade com prazos curtos" },
      { key: "ritmo_irregular", label: "Ritmo irregular (alterna lento/rápido)" },
    ],
  },
  {
    key: "engajamento",
    label: "Engajamento",
    barriers: [
      { key: "eng_desinteresse_escrita", label: "Demonstra desinteresse em atividades escritas" },
      { key: "eng_resiste_novas", label: "Resiste a atividades novas" },
      { key: "eng_mediacao_direta", label: "Participa apenas com mediação direta" },
      { key: "eng_visual_manipulativo", label: "Engaja mais com atividades visuais/manipulativas" },
    ],
  },
  {
    key: "expressao",
    label: "Expressão",
    barriers: [
      { key: "expr_respostas_longas", label: "Dificuldade para escrever respostas longas" },
      { key: "expr_oral_melhor", label: "Expressa-se melhor oralmente que por escrito" },
      { key: "expr_ortografia", label: "Dificuldade com ortografia/caligrafia" },
      { key: "expr_organizar_ideias", label: "Precisa de apoio para organizar ideias no papel" },
    ],
  },
];
