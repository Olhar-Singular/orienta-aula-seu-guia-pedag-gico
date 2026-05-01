-- =============================================================================
-- Supabase advisors fix — Bucket question-images sem listagem aberta
-- 2026-05-01
-- =============================================================================
-- Resolve advisor: public_bucket_allows_listing
--
-- O bucket `question-images` é público (`bucket.public = true`), então URLs
-- diretas continuam acessíveis pelo CDN sem precisar de policy de SELECT em
-- storage.objects. A policy `public_read_question_images` (anon, authenticated)
-- só servia para permitir LIST (storage.from('question-images').list()) — e
-- ninguém usa LIST no código (verificado em src/ e supabase/functions/).
--
-- Drop da policy fecha a superfície de listagem mantendo:
--   * Upload (policy de INSERT já restrita ao próprio user via path)
--   * GET via URL pública (CDN, não passa por RLS quando bucket.public = true)
-- =============================================================================

DROP POLICY IF EXISTS "public_read_question_images" ON storage.objects;
