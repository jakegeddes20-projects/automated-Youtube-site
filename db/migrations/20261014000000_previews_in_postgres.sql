-- Narration previews (short MP3s, ~0.5-1 MB each) used to live in Netlify
-- Blobs. They now live in Postgres as base64 text, so the site needs nothing
-- but the database. Keys match the old blob keys: episode-<id>-preview.mp3
-- and episode-<id>-preview-<voice>.mp3.
CREATE TABLE IF NOT EXISTS previews (
  key TEXT PRIMARY KEY,
  content_type TEXT NOT NULL DEFAULT 'audio/mpeg',
  data_base64 TEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
