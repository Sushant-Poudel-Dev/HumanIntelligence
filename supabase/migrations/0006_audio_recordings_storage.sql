-- Create storage bucket for audio recordings
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-recordings', 'audio-recordings', false);

-- RLS policies for audio-recordings bucket
-- Users can upload their own recordings
CREATE POLICY "Users can upload own recordings"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'audio-recordings'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can read their own recordings
CREATE POLICY "Users can read own recordings"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'audio-recordings'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete their own recordings
CREATE POLICY "Users can delete own recordings"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'audio-recordings'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
