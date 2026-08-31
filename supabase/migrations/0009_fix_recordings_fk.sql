-- Recreate recordings table with correct FK to public.users(id)

-- Save existing data
CREATE TEMPORARY TABLE recordings_backup AS
SELECT r.file_url, r.file_name, r.created_at, u.id AS correct_user_id
FROM public.recordings r
JOIN public.users u ON r.user_id = u.auth_id;

-- Drop and recreate
DROP TABLE public.recordings;

CREATE TABLE public.recordings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recordings"
  ON public.recordings FOR SELECT
  USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

CREATE POLICY "Users can insert own recordings"
  ON public.recordings FOR INSERT
  WITH CHECK (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

CREATE POLICY "Users can delete own recordings"
  ON public.recordings FOR DELETE
  USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- Restore data with correct user IDs
INSERT INTO public.recordings (user_id, file_url, file_name, created_at)
SELECT correct_user_id, file_url, file_name, created_at FROM recordings_backup;

DROP TABLE recordings_backup;
