"use client";

import Link from "next/link";
import { EpisodeRow } from "./SubjectCard";
import usePolling from "./usePolling";

export default function Library() {
  const { data, error } = usePolling("/api/subjects", 15000);
  if (error) return <p className="error">Could not load the library ({error}).</p>;
  if (!data) return <p className="muted">Loading…</p>;

  const finished = data.subjects.filter((s) => s.status === "done");
  if (!finished.length) return <div className="empty">No finished subjects yet.</div>;

  return finished.map((s) => (
    <div className="card" key={s.id}>
      <div className="card-head">
        <div className="card-title">
          <Link href={`/subjects/${s.id}`}>{s.prompt}</Link>
          <div className="card-meta">
            Finished {s.finished_at ? new Date(s.finished_at).toLocaleString() : ""} · {s.episodes.length} episode(s)
          </div>
        </div>
      </div>
      {s.output_dir && <div className="small muted" style={{ fontFamily: "ui-monospace, Consolas, monospace", marginTop: 6 }}>{s.output_dir}</div>}
      <div className="episodes">
        {s.episodes.map((ep) => <EpisodeRow key={ep.id} episode={ep} />)}
      </div>
    </div>
  ));
}
