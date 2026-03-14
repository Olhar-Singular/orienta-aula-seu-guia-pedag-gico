
-- Schools
create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique not null,
  created_at timestamptz default now()
);
alter table public.schools enable row level security;

-- School members
create table public.school_members (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade not null,
  user_id uuid not null,
  role text default 'teacher',
  joined_at timestamptz default now(),
  unique(school_id, user_id)
);
alter table public.school_members enable row level security;

-- Question bank
create table public.question_bank (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  created_by uuid not null,
  text text not null,
  subject text not null,
  topic text,
  difficulty text default 'medio',
  options jsonb,
  correct_answer int,
  resolution text,
  image_url text,
  source text,
  source_file_name text,
  is_public boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.question_bank enable row level security;

-- Helper functions
create or replace function public.is_school_member(_user_id uuid, _school_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.school_members
    where user_id = _user_id and school_id = _school_id
  )
$$;

create or replace function public.is_school_admin(_user_id uuid, _school_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.school_members
    where user_id = _user_id and school_id = _school_id and role = 'admin'
  )
$$;

-- RLS: schools
create policy "school_member_read" on public.schools
  for select to authenticated
  using (public.is_school_member(auth.uid(), id));

create policy "school_create" on public.schools
  for insert to authenticated
  with check (true);

create policy "school_admin_update" on public.schools
  for update to authenticated
  using (public.is_school_admin(auth.uid(), id));

-- RLS: school_members
create policy "member_read" on public.school_members
  for select to authenticated
  using (public.is_school_member(auth.uid(), school_id));

create policy "member_join" on public.school_members
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "member_leave" on public.school_members
  for delete to authenticated
  using (user_id = auth.uid());

-- RLS: question_bank
create policy "question_bank_owner" on public.question_bank
  for all to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "question_bank_school_read" on public.question_bank
  for select to authenticated
  using (
    is_public = true
    and public.is_school_member(auth.uid(), school_id)
  );

-- Storage bucket
insert into storage.buckets (id, name, public) values ('question-images', 'question-images', true)
on conflict (id) do nothing;

create policy "auth_upload_question_images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'question-images');

create policy "public_read_question_images" on storage.objects
  for select to public
  using (bucket_id = 'question-images');

create policy "owner_delete_question_images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'question-images');
