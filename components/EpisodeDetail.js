"use client";

import Link from "next/link";
import { useState } from "react";
import { VOICES } from "../lib/options";
import EventLog from "./EventLog";
import StageBar from "./StageBar";
import usePolling from "./usePolling";

function fmtDuration(seconds) {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function paragraphsOf(text) {
  return text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}

// The worker sends the chapter texts alongside the script; older rows only
// have the script, shown as one block.
function chaptersOf(episode) {
  if (Array.isArray(episode.chapters) && episode.chapters.length) {
    return episode.chapters.map((text, i) => ({
      title: episode.outline?.chapters?.[i]?.title || null,
      paragraphs: paragraphsOf(text),
    }));
  }
  return [{ title: null, paragraphs: paragraphsOf(episode.script) }];
}

// The same 90-second opening read in each other voice, with a button to
// re-record the whole subject in that voice.
function VoiceComparison({ episode, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const available = Array.isArray(episode.voice_previews) ? episode.voice_previews : [];
  const others = VOICES.filter((v) => v.id !== episode.voice);
  const busySubject = ["queued", "researching", "planning", "writing", "voicing", "producing"].includes(episode.subject_status);

  async function useVoice(voice) {
    if (!window.confirm(`Re-record every episode of this subject with ${voice.label}? The scripts stay exactly as they are.`)) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/subjects/${episode.subject_id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rerecord", voice: voice.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "That didn't work.");
      setMessage(`Queued — re-recording with ${voice.label}.`);
      onChanged?.();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!available.length) {
    return <p className="small muted">Other-voice previews appear here once the narration is recorded.</p>;
  }
  return (
    <>
      {message && <p className="small" style={{ color: "var(--accent)" }}>{message}</p>}
      <div className="voice-grid">
        {others.map((v) => (
          <div className="voice-card" key={v.id}>
            <div className="voice-head">
              <span>{v.label}</span>
              {available.includes(v.id) && (
                <button className="secondary" disabled={busy || busySubject} onClick={() => useVoice(v)}>Use this voice</button>
              )}
            </div>
            {available.includes(v.id)
              ? <audio controls preload="none" src={`/api/audio/${episode.id}?voice=${v.id}`} />
              : <p className="small muted" style={{ margin: "6px 0 0" }}>Not recorded yet.</p>}
          </div>
        ))}
      </div>
    </>
  );
}

export default function EpisodeDetail({ id }) {
  const { data, error, reload } = usePolling(`/api/episodes/${id}`, 8000);
  if (error) return <p className="error">Could not load this episode ({error}).</p>;
  if (!data) return <p className="muted">Loading…</p>;

  const { episode, events } = data;
  const minutes = episode.word_count ? Math.round(episode.word_count / 160) : null;

  return (
    <>
      <div className="crumbs">
        <Link href="/">Queue</Link> / <Link href={`/subjects/${episode.subject_id}`}>{episode.subject_prompt}</Link> / Episode {episode.position}
      </div>
      <h1>{episode.title || "Untitled episode"}</h1>
      {episode.angle && <p className="subtitle">{episode.angle}</p>}

      <StageBar episode={episode} />

      <div className="facts">
        <div className="fact"><div className="k">Script</div><div className="v">{episode.word_count ? `${episode.word_count.toLocaleString()} words · ~${minutes} min` : episode.script_status}</div></div>
        <div className="fact"><div className="k">Voice-over</div><div className="v">{episode.voiceover_status === "done" ? `${fmtDuration(episode.voiceover_seconds)} · ${episode.voice}` : episode.voiceover_status}</div></div>
        <div className="fact"><div className="k">Style</div><div className="v">{episode.style?.replace("_", " ")}</div></div>
        {episode.output_dir && <div className="fact"><div className="k">Folder on your PC</div><div className="v path">{episode.output_dir}</div></div>}
        {episode.video_status === "done" && <div className="fact"><div className="k">Video</div><div className="v path">{episode.output_dir}ideo.mp4</div></div>}
      </div>

      {episode.error && <div className="error-box">{episode.error}</div>}

      {episode.voiceover_key && (
        <>
          <h2>Listen (first 90 seconds)</h2>
          <audio controls preload="none" src={`/api/audio/${episode.id}`} />
          <p className="small muted">The full narration is in the episode folder on your PC as voiceover.mp3 (and voiceover.wav, full quality).</p>

          <h2>Compare voices</h2>
          <p className="small muted">The same opening, read by each of the other voices. Current voice: <b>{VOICES.find((v) => v.id === episode.voice)?.label || episode.voice}</b>.</p>
          <VoiceComparison episode={episode} onChanged={reload} />
        </>
      )}

      {episode.script ? (
        <>
          <h2>Script</h2>
          <div className="script">
            {chaptersOf(episode).map((c, i) => (
              <div key={i}>
                {c.title && <div className="chapter-label">Chapter {i + 1} · {c.title}</div>}
                {c.paragraphs.map((p, j) => <p key={j}>{p}</p>)}
              </div>
            ))}
          </div>
        </>
      ) : episode.outline?.chapters ? (
        <>
          <h2>Outline</h2>
          <div className="script">
            {episode.outline.chapters.map((c) => (
              <div key={c.number}>
                <div className="chapter-label">Chapter {c.number} · {c.title}</div>
                <p className="muted small">{c.purpose}</p>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="muted">The script hasn't been written yet.</p>
      )}

      <h2>Log</h2>
      <EventLog events={events} />
    </>
  );
}
