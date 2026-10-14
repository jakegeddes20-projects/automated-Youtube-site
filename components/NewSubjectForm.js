"use client";

import { useEffect, useState } from "react";
import adminFetch from "../lib/admin-client";
import { EPISODE_MINUTES, STYLES, VIDEOS_PER_SUBJECT, VOICES } from "../lib/options";

// "Type a subject, press Go." The four settings start from the saved defaults
// (Settings page) and can be changed per subject.
export default function NewSubjectForm({ defaults, onCreated }) {
  const [prompt, setPrompt] = useState("");
  const [settings, setSettings] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (defaults && !settings) {
      setSettings({
        videos_per_subject: Number(defaults.videos_per_subject),
        episode_minutes: Number(defaults.episode_minutes),
        voice: defaults.voice,
        style: defaults.style,
      });
    }
  }, [defaults, settings]);

  function set(key, value) {
    setSettings((s) => ({ ...s, [key]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    if (!prompt.trim() || !settings) return;
    setBusy(true);
    setError(null);
    try {
      const res = await adminFetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, ...settings }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not queue that subject.");
      setPrompt("");
      onCreated?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const style = STYLES.find((s) => s.id === settings?.style);
  const total = settings ? settings.videos_per_subject * settings.episode_minutes : 0;

  return (
    <form className="go-form" onSubmit={submit}>
      <div className="go-row">
        <input
          id="subject-prompt"
          type="text"
          placeholder="Type a subject — e.g. Old Republic Star Wars"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          maxLength={300}
          autoFocus
        />
        <button type="submit" disabled={busy || !prompt.trim() || !settings}>
          {busy ? "Queuing…" : "Go"}
        </button>
      </div>

      {settings && (
        <div className="settings-row">
          <label>
            Videos from this subject
            <select id="videos" value={settings.videos_per_subject} onChange={(e) => set("videos_per_subject", Number(e.target.value))}>
              {VIDEOS_PER_SUBJECT.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label>
            Episode length
            <select id="minutes" value={settings.episode_minutes} onChange={(e) => set("episode_minutes", Number(e.target.value))}>
              {EPISODE_MINUTES.map((m) => <option key={m} value={m}>{m} minutes</option>)}
            </select>
          </label>
          <label>
            Voice
            <select id="voice" value={settings.voice} onChange={(e) => set("voice", e.target.value)}>
              {VOICES.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
            </select>
          </label>
          <label>
            Style
            <select id="style" value={settings.style} onChange={(e) => set("style", e.target.value)}>
              {STYLES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
        </div>
      )}

      {settings && (
        <p className="hint">
          {settings.videos_per_subject} × {settings.episode_minutes} min = about {total} minutes of finished narration.
          {style ? ` ${style.description}` : ""}
        </p>
      )}
      {error && <p className="error">{error}</p>}
    </form>
  );
}
