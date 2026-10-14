"use client";

import { useEffect, useState } from "react";
import adminFetch from "../lib/admin-client";
import { EPISODE_MINUTES, STYLES, VIDEOS_PER_SUBJECT, VOICES } from "../lib/options";

export default function SettingsForm() {
  const [settings, setSettings] = useState(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Reading the defaults is public; only saving them needs the password.
    fetch("/api/settings").then((r) => r.json()).then((d) => setSettings(d.settings)).catch(() => setError("Could not load settings."));
  }, []);

  async function save(e) {
    e.preventDefault();
    setSaved(false);
    setError(null);
    try {
      const res = await adminFetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setError(data.error || "Could not save.");
      setSettings(data.settings);
      setSaved(true);
    } catch (err) {
      setError(err.message);
    }
  }

  if (!settings) return <p className="muted">{error || "Loading…"}</p>;
  const set = (k, v) => { setSaved(false); setSettings((s) => ({ ...s, [k]: v })); };

  return (
    <form className="go-form" onSubmit={save}>
      <div className="settings-row">
        <label>
          Videos from each subject
          <select id="default-videos" value={settings.videos_per_subject} onChange={(e) => set("videos_per_subject", e.target.value)}>
            {VIDEOS_PER_SUBJECT.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label>
          Episode length
          <select id="default-minutes" value={settings.episode_minutes} onChange={(e) => set("episode_minutes", e.target.value)}>
            {EPISODE_MINUTES.map((m) => <option key={m} value={m}>{m} minutes</option>)}
          </select>
        </label>
        <label>
          Voice
          <select id="default-voice" value={settings.voice} onChange={(e) => set("voice", e.target.value)}>
            {VOICES.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
          </select>
        </label>
        <label>
          Style
          <select id="default-style" value={settings.style} onChange={(e) => set("style", e.target.value)}>
            {STYLES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
      </div>
      <div style={{ marginTop: 14, display: "flex", gap: 12, alignItems: "center" }}>
        <button type="submit">Save defaults</button>
        {saved && <span className="small" style={{ color: "var(--ok)" }}>Saved.</span>}
        {error && <span className="error" style={{ margin: 0 }}>{error}</span>}
      </div>
      <h2>Styles</h2>
      {STYLES.map((s) => <p key={s.id} className="small" style={{ margin: "4px 0" }}><b>{s.label}</b> — {s.description}</p>)}
    </form>
  );
}
