/**
 * Sanitiza texto DSL gerado por AI para o parser.
 *
 * As substituições de escape sequences literais (\n, \t, \\, \") que existiam
 * antes foram REMOVIDAS: eram necessárias apenas no modo JSON antigo (tool_call),
 * onde o AI double-escapava dentro do JSON. No modo DSL atual, o texto já chega
 * limpo após JSON.parse() da resposta da API. Manter essas substituições
 * quebraria comandos LaTeX como \text, \times, \theta, \nabla, etc.
 */
export function normalizeAIText(text: string): string {
  return (
    text
      // Caracteres invisíveis problemáticos
      .replace(/\u200B|\u200C|\u200D|\uFEFF/g, "") // zero-width chars, BOM
      .replace(/\x0C/g, "") // form-feed — gerado por \frac em template literals JS

      // Normalizar line endings
      .replace(/\r\n/g, "\n") // Windows CRLF → LF
      .replace(/\r/g, "\n") // Loose CR → LF
  );
}
