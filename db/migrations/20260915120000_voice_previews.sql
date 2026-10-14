-- Which alternative-voice 90-second previews exist for each episode (a JSON
-- array of voice ids), so the episode page can offer a voice comparison.
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS voice_previews JSONB NOT NULL DEFAULT '[]'::jsonb;
