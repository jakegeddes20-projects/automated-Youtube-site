-- Jake picked four voices (George, Emma, Bella, Michael); George is the default.
ALTER TABLE subjects ALTER COLUMN voice SET DEFAULT 'bm_george';
UPDATE settings SET value = 'bm_george'
WHERE key = 'voice' AND value NOT IN ('bm_george', 'bf_emma', 'af_bella', 'am_michael');
