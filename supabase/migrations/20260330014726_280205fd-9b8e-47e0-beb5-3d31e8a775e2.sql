-- NOTE: trigger originally created by 20260208012446. This file was likely generated
-- by a Lovable re-sync and is a duplicate. Guarded with DROP TRIGGER IF EXISTS so
-- `supabase db reset` doesn't fail with "trigger already exists".
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();