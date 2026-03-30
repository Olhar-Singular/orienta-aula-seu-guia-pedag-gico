-- Add RBAC columns to profiles: is_super_admin and is_active
alter table public.profiles
  add column if not exists is_super_admin boolean not null default false,
  add column if not exists is_active boolean not null default true;

-- Helper: check if user is super-admin
create or replace function public.is_super_admin(_user_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce(
    (select is_super_admin from public.profiles where user_id = _user_id),
    false
  );
$$;

-- Helper: check if user is active
create or replace function public.is_user_active(_user_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce(
    (select is_active from public.profiles where user_id = _user_id),
    true
  );
$$;
