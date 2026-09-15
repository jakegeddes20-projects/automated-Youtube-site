"use client";

import NewSubjectForm from "./NewSubjectForm";
import SubjectCard from "./SubjectCard";
import WorkerPill from "./WorkerPill";
import usePolling from "./usePolling";

const ACTIVE = ["researching", "planning", "writing", "voicing", "producing", "queued", "paused", "failed"];

export default function Dashboard() {
  const { data, error, reload } = usePolling("/api/subjects", 5000);
  const subjects = data?.subjects || [];
  const active = subjects.filter((s) => ACTIVE.includes(s.status));
  const finished = subjects.filter((s) => !ACTIVE.includes(s.status)).slice(0, 5);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <h1>What should the next videos be about?</h1>
          <p className="subtitle" style={{ margin: 0 }}>Type a subject and press Go. Your PC does the rest.</p>
        </div>
        <WorkerPill worker={data?.worker} />
      </div>

      <NewSubjectForm defaults={data?.settings} onCreated={reload} />

      {error && <p className="error">Can't reach the site right now ({error}). Retrying…</p>}

      <h2>In progress and queued</h2>
      {data && active.length === 0 && <div className="empty">Nothing queued. Type a subject above to start.</div>}
      {active.map((s) => <SubjectCard key={s.id} subject={s} onChanged={reload} workerOnline={data?.worker?.online ?? true} />)}

      {finished.length > 0 && (
        <>
          <h2>Recently finished</h2>
          {finished.map((s) => <SubjectCard key={s.id} subject={s} onChanged={reload} />)}
          <p className="small muted">Everything finished is in the <a href="/library">Library</a>.</p>
        </>
      )}
    </>
  );
}
