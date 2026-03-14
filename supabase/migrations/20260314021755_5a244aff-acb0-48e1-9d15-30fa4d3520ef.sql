
create table public.adaptations_history (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null,
  student_id uuid references public.class_students(id),
  class_id uuid references public.classes(id),
  original_activity text not null,
  activity_type text,
  barriers_used jsonb not null default '[]'::jsonb,
  adaptation_result jsonb not null default '{}'::jsonb,
  model_used text,
  tokens_used int,
  created_at timestamptz default now()
);

alter table public.adaptations_history enable row level security;

create policy "teacher_own_adaptations_history" on public.adaptations_history
  for all to authenticated
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());
