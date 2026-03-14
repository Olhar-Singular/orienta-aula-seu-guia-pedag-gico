CREATE POLICY "public_read_shared_adaptations" ON public.adaptations_history FOR SELECT TO anon, authenticated USING (
  EXISTS (
    SELECT 1 FROM public.shared_adaptations sa
    WHERE sa.adaptation_id = adaptations_history.id
      AND sa.expires_at > now()
  )
);