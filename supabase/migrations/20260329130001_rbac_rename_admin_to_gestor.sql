-- Rename role 'admin' to 'gestor' in school_members
update public.school_members set role = 'gestor' where role = 'admin';

-- Helper: check if user is gestor of a school
create or replace function public.is_school_gestor(_user_id uuid, _school_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.school_members
    where user_id = _user_id and school_id = _school_id and role = 'gestor'
  );
$$;

-- Redefine is_school_admin for backward compat with existing RLS policies:
-- gestor OR super-admin both count as "admin" for RLS purposes
create or replace function public.is_school_admin(_user_id uuid, _school_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select public.is_school_gestor(_user_id, _school_id)
      or public.is_super_admin(_user_id);
$$;
