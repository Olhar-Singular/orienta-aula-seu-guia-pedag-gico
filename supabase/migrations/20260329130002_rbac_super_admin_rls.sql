-- RLS policies for super-admin cross-school access

-- schools: super-admin can read all schools
create policy "super_admin_read_all_schools" on public.schools
  for select to authenticated
  using (public.is_super_admin(auth.uid()));

-- schools: super-admin can update all schools
create policy "super_admin_update_all_schools" on public.schools
  for update to authenticated
  using (public.is_super_admin(auth.uid()));

-- schools: super-admin can delete schools
create policy "super_admin_delete_schools" on public.schools
  for delete to authenticated
  using (public.is_super_admin(auth.uid()));

-- school_members: super-admin can read all members
create policy "super_admin_read_all_members" on public.school_members
  for select to authenticated
  using (public.is_super_admin(auth.uid()));

-- ai_usage_logs: super-admin can read all logs
create policy "super_admin_read_all_ai_logs" on public.ai_usage_logs
  for select to authenticated
  using (public.is_super_admin(auth.uid()));

-- profiles: super-admin can read all profiles
create policy "super_admin_read_all_profiles" on public.profiles
  for select to authenticated
  using (public.is_super_admin(auth.uid()));

-- profiles: super-admin can update all profiles (for toggling is_active)
create policy "super_admin_update_all_profiles" on public.profiles
  for update to authenticated
  using (public.is_super_admin(auth.uid()));
