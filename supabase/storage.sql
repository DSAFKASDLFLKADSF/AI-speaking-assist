-- =============================================================================
-- Supabase Storage — audio-responses bucket
-- Run in Supabase SQL Editor AFTER schema.sql
-- Dashboard → SQL → New query → paste & Run
-- =============================================================================

-- Private bucket for user recordings (signed URLs for playback)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audio-responses',
  'audio-responses',
  false,
  52428800,
  ARRAY['audio/webm', 'audio/wav', 'audio/x-wav', 'audio/mpeg', 'audio/mp4', 'audio/ogg']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Logged-in users: upload/read under {user_id}/
CREATE POLICY "audio_auth_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'audio-responses'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "audio_auth_select_own"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'audio-responses'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "audio_auth_update_own"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'audio-responses'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "audio_auth_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'audio-responses'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Anonymous dev uploads: upload/read under anonymous/ (listen-repeat allowAnonymous)
CREATE POLICY "audio_anon_insert"
ON storage.objects FOR INSERT TO anon
WITH CHECK (
  bucket_id = 'audio-responses'
  AND (storage.foldername(name))[1] = 'anonymous'
);

CREATE POLICY "audio_anon_select"
ON storage.objects FOR SELECT TO anon
USING (
  bucket_id = 'audio-responses'
  AND (storage.foldername(name))[1] = 'anonymous'
);
