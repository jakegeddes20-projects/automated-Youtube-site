import { db } from "./db";

// Shared database reads/writes used by more than one route.

export async function getSettings() {
  const rows = await db().sql`SELECT key, value FROM settings`;
  const settings = {};
  for (const row of rows) settings[row.key] = row.value;
  return settings;
}

export async function getWorkerStatus() {
  const [row] = await db().sql`
    SELECT hostname, current_task, last_seen,
           EXTRACT(EPOCH FROM (NOW() - last_seen)) AS seconds_ago
    FROM worker_status WHERE id = 1
  `;
  if (!row) return { online: false, current_task: null, last_seen: null };
  const secondsAgo = Number(row.seconds_ago);
  return {
    online: secondsAgo < 60,
    hostname: row.hostname,
    current_task: row.current_task,
    last_seen: row.last_seen,
    seconds_ago: Math.round(secondsAgo),
  };
}

export async function getSubjectWithEpisodes(id) {
  const database = db();
  const [subject] = await database.sql`SELECT * FROM subjects WHERE id = ${id}`;
  if (!subject) return null;
  const episodes = await database.sql`
    SELECT id, subject_id, position, title, angle, word_count, script_status,
           voiceover_status, voiceover_key, voiceover_seconds, video_status,
           publish_status, youtube_url, output_dir, error, updated_at
    FROM episodes WHERE subject_id = ${id} ORDER BY position
  `;
  return { ...subject, episodes };
}

export async function getEvents({ subjectId, episodeId, limit = 50 }) {
  const database = db();
  if (episodeId) {
    return database.sql`
      SELECT id, level, message, created_at, episode_id FROM events
      WHERE episode_id = ${episodeId} ORDER BY id DESC LIMIT ${limit}
    `;
  }
  return database.sql`
    SELECT id, level, message, created_at, episode_id FROM events
    WHERE subject_id = ${subjectId} ORDER BY id DESC LIMIT ${limit}
  `;
}

export async function addEvent({ subjectId, episodeId = null, level = "info", message }) {
  await db().sql`
    INSERT INTO events (subject_id, episode_id, level, message)
    VALUES (${subjectId}, ${episodeId}, ${level}, ${message})
  `;
}

// Route ids arrive as strings (and Netlify may try "/3.html" on a miss);
// anything that isn't a positive integer is simply "not found".
export function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}
