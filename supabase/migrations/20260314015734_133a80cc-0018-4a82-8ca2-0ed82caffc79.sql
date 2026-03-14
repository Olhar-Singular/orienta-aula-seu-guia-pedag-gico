
-- Turmas
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null,
  name text not null,
  description text,
  school_year text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.classes enable row level security;

create policy "teacher_own_classes" on public.classes
  for all to authenticated
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

-- Helper function to check class ownership (after table exists)
create or replace function public.is_class_owner(_user_id uuid, _class_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.classes
    where id = _class_id and teacher_id = _user_id
  )
$$;

-- Alunos vinculados a turmas
create table public.class_students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references public.classes(id) on delete cascade not null,
  name text not null,
  registration_code text,
  notes text,
  created_at timestamptz default now()
);

alter table public.class_students enable row level security;

create policy "teacher_own_students" on public.class_students
  for all to authenticated
  using (public.is_class_owner(auth.uid(), class_id))
  with check (public.is_class_owner(auth.uid(), class_id));

-- Barreiras observáveis por aluno
create table public.student_barriers (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.class_students(id) on delete cascade not null,
  dimension text not null,
  barrier_key text not null,
  is_active boolean default true,
  notes text,
  updated_at timestamptz default now(),
  unique(student_id, barrier_key)
);

alter table public.student_barriers enable row level security;

create policy "teacher_own_barriers" on public.student_barriers
  for all to authenticated
  using (
    exists (
      select 1 from public.class_students cs
      where cs.id = student_id
      and public.is_class_owner(auth.uid(), cs.class_id)
    )
  )
  with check (
    exists (
      select 1 from public.class_students cs
      where cs.id = student_id
      and public.is_class_owner(auth.uid(), cs.class_id)
    )
  );

-- Triggers for updated_at
create trigger update_classes_updated_at
  before update on public.classes
  for each row execute function public.update_updated_at_column();

create trigger update_student_barriers_updated_at
  before update on public.student_barriers
  for each row execute function public.update_updated_at_column();
