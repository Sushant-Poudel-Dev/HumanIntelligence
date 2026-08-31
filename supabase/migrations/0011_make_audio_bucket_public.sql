-- Make audio-recordings bucket public so URLs work in <audio> elements
UPDATE storage.buckets SET public = true WHERE id = 'audio-recordings';
