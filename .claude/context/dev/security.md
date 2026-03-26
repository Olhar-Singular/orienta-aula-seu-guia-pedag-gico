# Segurança

- **Nunca push direto para `main`** — usar feature branches + PR
- `.env` no `.gitignore` — nunca commitar credenciais
- Tokens de compartilhamento expiram em 7 dias
- Share tokens excluem caracteres ambíguos (0, O, l, I, 1)
- Validação de magic bytes para uploads (PDF: `%PDF`, DOCX: `PK`, imagens: JPEG/PNG headers)
- Auth via Supabase com session em localStorage + auto-refresh
