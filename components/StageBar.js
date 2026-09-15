"use client";

// The four stages every episode passes through, as a compact progress bar.
const STAGES = [
  ["Script", "script_status"],
  ["Voice", "voiceover_status"],
  ["Video", "video_status"],
  ["Published", "publish_status"],
];

function classFor(value) {
  if (value === "done") return "done";
  if (value === "failed") return "failed";
  if (value && value !== "pending") return "running";
  return "";
}

export default function StageBar({ episode }) {
  return (
    <div className="stages" aria-label="progress">
      {STAGES.map(([label, key]) => (
        <div key={key} className={`stage ${classFor(episode[key])}`} title={`${label}: ${episode[key]}`}>
          <div className="bar" />
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}
