# Áreas Frágeis e Performance

## Áreas Frágeis

- `src/lib/pdf/` — parsing de texto complexo com LaTeX e fontes
- `src/integrations/supabase/client.ts` — auto-gerado
- Renumeração de questões após deleção em renderers

## Memória e Performance

- Testes rodam com `NODE_OPTIONS='--max-old-space-size=19456'`
- Vitest usa fork pool (max 4 workers) para estabilidade de memória
- PDF: max 8 páginas de imagem, texto limitado a 8000 chars
