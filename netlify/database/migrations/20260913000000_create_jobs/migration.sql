CREATE TABLE IF NOT EXISTS jobs (
  id SERIAL PRIMARY KEY,
  topic TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  script TEXT,
  voiceover_status TEXT NOT NULL DEFAULT 'pending',
  voiceover_key TEXT,
  image_status TEXT NOT NULL DEFAULT 'pending',
  image_key TEXT,
  video_status TEXT NOT NULL DEFAULT 'pending',
  video_key TEXT,
  publish_status TEXT NOT NULL DEFAULT 'pending',
  youtube_url TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
