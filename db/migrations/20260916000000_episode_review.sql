-- The reviewer's report for each episode (scores, issues, image stats, pronunciation suspects).
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS review JSONB;
