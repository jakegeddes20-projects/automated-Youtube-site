// The four output settings shown under the subject box. Shared by the API
// (validation) and the dashboard (dropdowns) so the two can never disagree.

export const VIDEOS_PER_SUBJECT = [1, 2, 3];

export const EPISODE_MINUTES = [15, 30, 45, 60];

export const VOICES = [
  { id: "af_sarah", label: "Sarah (US, female)" },
  { id: "af_heart", label: "Heart (US, female)" },
  { id: "af_bella", label: "Bella (US, female)" },
  { id: "af_nicole", label: "Nicole (US, female)" },
  { id: "am_adam", label: "Adam (US, male)" },
  { id: "am_michael", label: "Michael (US, male)" },
  { id: "bf_emma", label: "Emma (UK, female)" },
  { id: "bm_daniel", label: "Daniel (UK, male)" },
  { id: "bm_george", label: "George (UK, male)" },
  { id: "bm_lewis", label: "Lewis (UK, male)" },
];

export const STYLES = [
  {
    id: "documentary",
    label: "Documentary",
    description: "Measured, factual retelling of the lore, in order, with context.",
  },
  {
    id: "fan_theory",
    label: "Fan theory",
    description: "Builds a case for an interpretation, weighing evidence for and against.",
  },
  {
    id: "story",
    label: "Story retelling",
    description: "Narrative-driven, told like a story with characters and stakes.",
  },
];

export const SUBJECT_STATUSES = [
  "queued",
  "researching",
  "planning",
  "writing",
  "voicing",
  "done",
  "failed",
  "paused",
  "cancelled",
];

// Stages shown as the progress bar on every episode row, in order.
export const EPISODE_STAGES = ["Script", "Voice", "Video", "Published"];

export function normalizeSettings(input, defaults) {
  const videos = Number(input.videos_per_subject ?? defaults.videos_per_subject);
  const minutes = Number(input.episode_minutes ?? defaults.episode_minutes);
  const voice = String(input.voice ?? defaults.voice);
  const style = String(input.style ?? defaults.style);

  const problems = [];
  if (!VIDEOS_PER_SUBJECT.includes(videos)) problems.push("videos_per_subject");
  if (!EPISODE_MINUTES.includes(minutes)) problems.push("episode_minutes");
  if (!VOICES.some((v) => v.id === voice)) problems.push("voice");
  if (!STYLES.some((s) => s.id === style)) problems.push("style");

  return {
    settings: { videos_per_subject: videos, episode_minutes: minutes, voice, style },
    problems,
  };
}
