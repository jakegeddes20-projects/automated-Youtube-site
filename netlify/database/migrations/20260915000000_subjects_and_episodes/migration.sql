-- Phase 1 of the 45-minute-episode rebuild: the site becomes a control panel
-- and queue; the PC worker does all research, writing, voice and video work.
--
-- A "subject" is what Jake types (plus the four output settings). The worker
-- plans N "episodes" from it. "events" is the plain-English log shown on the
-- dashboard. "worker_status" is the heartbeat behind the online/offline pill.
-- The original prototype "jobs" table is left in place but no longer used.

CREATE TABLE IF NOT EXISTS subjects (
  id SERIAL PRIMARY KEY,
  prompt TEXT NOT NULL,
  videos_per_subject INTEGER NOT NULL DEFAULT 3,
  episode_minutes INTEGER NOT NULL DEFAULT 45,
  voice TEXT NOT NULL DEFAULT 'af_sarah',
  style TEXT NOT NULL DEFAULT 'documentary',
  -- queued | researching | planning | writing | voicing | done | failed | paused | cancelled
  status TEXT NOT NULL DEFAULT 'queued',
  stage_detail TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  research_brief TEXT,
  series_plan TEXT,
  output_dir TEXT,
  claimed_at TIMESTAMP,
  finished_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS episodes (
  id SERIAL PRIMARY KEY,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  title TEXT,
  angle TEXT,
  outline JSONB,
  script TEXT,
  word_count INTEGER,
  script_status TEXT NOT NULL DEFAULT 'pending',
  voiceover_status TEXT NOT NULL DEFAULT 'pending',
  voiceover_key TEXT,
  voiceover_seconds REAL,
  video_status TEXT NOT NULL DEFAULT 'pending',
  publish_status TEXT NOT NULL DEFAULT 'pending',
  youtube_url TEXT,
  output_dir TEXT,
  error TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (subject_id, position)
);

CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
  episode_id INTEGER REFERENCES episodes(id) ON DELETE CASCADE,
  level TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS events_subject_idx ON events (subject_id, id DESC);

CREATE TABLE IF NOT EXISTS worker_status (
  id INTEGER PRIMARY KEY DEFAULT 1,
  hostname TEXT,
  current_task TEXT,
  last_seen TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT INTO settings (key, value) VALUES
  ('videos_per_subject', '3'),
  ('episode_minutes', '45'),
  ('voice', 'af_sarah'),
  ('style', 'documentary')
ON CONFLICT (key) DO NOTHING;
