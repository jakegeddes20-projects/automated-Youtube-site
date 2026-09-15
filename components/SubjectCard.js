"use client";

import Link from "next/link";
import { useState } from "react";
import { VOICES } from "../lib/options";
import StageBar from "./StageBar";

const RUNNING = ["researching", "planning", "writing", "voicing", "producing"];

export const STATUS_LABELS = {
  queued: "Queued",
  researching: "Researching",
  planning: "Planning episodes",
  writing: "Writing",
  voicing: "Recording voice-over",
  producing: "Making the video",
  done: "Done",
  failed: "Failed",
  paused: "Paused",
  cancelled: "Cancelled",
};

export function statusClass(status) {
  return RUNNING.includes(status) ? "running" : status;
}

function fmtDuration(seconds) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function EpisodeRow({ episode }) {
  const sub = [];
  if (episode.word_count) sub.push(`${episode.word_count.toLocaleString()} words`);
  if (episode.voiceover_seconds) sub.push(`${fmtDuration(episode.voiceover_seconds)} narration`);
  if (episode.error) sub.push(`Problem: ${episode.error}`);
  return (
    <div className="episode-row">
      <div>
        <div className="title">
          <Link href={`/episodes/${episode.id}`}>
            {episode.position}. {episode.title || "Untitled episode"}
          </Link>
        </div>
        {sub.length > 0 && <div className="sub">{sub.join(" · ")}</div>}
      </div>
      <StageBar episode={episode} />
    </div>
  );
}

// Defined at module level (not inside SubjectCard) so React keeps the same
// button elements across the 5-second polls; otherwise every refresh
// remounts them and a click can land on a button that no longer exists.
function ActionButton({ action, label, danger, busy, onAct }) {
  return (
    <button className={`secondary ${danger ? "danger" : ""}`} disabled={busy !== null} onClick={() => onAct(action)}>
      {busy === action ? "…" : label}
    </button>
  );
}

// One subject in the queue: its status, controls, and its episodes.
export default function SubjectCard({ subject, onChanged, workerOnline = true }) {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const s = subject.status;

  async function act(action, extra = {}) {
    if (action === "delete" && !window.confirm("Delete this subject and its episodes from the site? Files on the PC are not touched.")) return;
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/subjects/${subject.id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "That didn't work.");
      onChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }


  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">
          <Link href={`/subjects/${subject.id}`}>{subject.prompt}</Link>
          <div className="card-meta">
            {subject.videos_per_subject} × {subject.episode_minutes} min · {subject.style.replace("_", " ")} ·{" "}
            {new Date(subject.created_at).toLocaleString()}
            {" · "}
            {["queued", "paused", "researching", "planning", "writing"].includes(s) ? (
              <label>
                voice{" "}
                <select
                  className="inline"
                  value={subject.voice}
                  disabled={busy !== null}
                  onChange={(e) => act("set_voice", { voice: e.target.value })}
                >
                  {VOICES.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
                </select>
              </label>
            ) : (
              <>voice {VOICES.find((v) => v.id === subject.voice)?.label || subject.voice}</>
            )}
          </div>
        </div>
        <span className={`status ${statusClass(s)}`}>{STATUS_LABELS[s] || s}</span>
        <div className="card-actions">
          {s === "queued" && <ActionButton action="move_up" label="Move up" busy={busy} onAct={act} />}
          {(s === "queued" || RUNNING.includes(s)) && <ActionButton action="pause" label="Pause" busy={busy} onAct={act} />}
          {s === "paused" && <ActionButton action="resume" label="Resume" busy={busy} onAct={act} />}
          {(s === "failed" || s === "cancelled" || (RUNNING.includes(s) && !workerOnline)) && <ActionButton action="retry" label="Retry" busy={busy} onAct={act} />}
          {s !== "done" && s !== "cancelled" && <ActionButton action="cancel" label="Cancel" danger busy={busy} onAct={act} />}
          {!RUNNING.includes(s) && <ActionButton action="delete" label="Delete" danger busy={busy} onAct={act} />}
        </div>
      </div>

      {RUNNING.includes(s) && workerOnline && subject.stage_detail && <div className="stage-detail">{subject.stage_detail}</div>}
      {RUNNING.includes(s) && !workerOnline && (
        <div className="stage-detail" style={{ color: "var(--warn)" }}>
          The PC is offline, so this is on hold. Start the worker and it will carry on where it left off — or press Retry.
        </div>
      )}
      {s === "failed" && subject.error && <div className="error-box">{subject.error}</div>}
      {error && <p className="error">{error}</p>}

      {subject.episodes?.length > 0 && (
        <div className="episodes">
          {subject.episodes.map((ep) => <EpisodeRow key={ep.id} episode={ep} />)}
        </div>
      )}
    </div>
  );
}
