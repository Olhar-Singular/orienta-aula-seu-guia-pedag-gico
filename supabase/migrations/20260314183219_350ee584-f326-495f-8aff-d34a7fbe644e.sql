
CREATE TABLE public.hidden_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  activity_type text NOT NULL,
  activity_id uuid NOT NULL,
  hidden_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, activity_type, activity_id)
);

ALTER TABLE public.hidden_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_hidden"
ON public.hidden_activities
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
