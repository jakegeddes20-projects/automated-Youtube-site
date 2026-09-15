"use client";

import Link from "next/link";
import EventLog from "./EventLog";
import SubjectCard from "./SubjectCard";
import usePolling from "./usePolling";

function parse(json) {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export default function SubjectDetail({ id }) {
  const { data, error, reload } = usePolling(`/api/subjects/${id}`, 5000);
  if (error) return <p className="error">Could not load this subject ({error}).</p>;
  if (!data) return <p className="muted">Loading…</p>;

  const { subject, events } = data;
  const brief = parse(subject.research_brief);
  const plan = parse(subject.series_plan);

  return (
    <>
      <div className="crumbs"><Link href="/">Queue</Link> / Subject</div>
      <SubjectCard subject={subject} onChanged={reload} />

      {subject.output_dir && (
        <div className="facts">
          <div className="fact"><div className="k">Folder on your PC</div><div className="v path">{subject.output_dir}</div></div>
          <div className="fact"><div className="k">Voice</div><div className="v">{subject.voice}</div></div>
        </div>
      )}

      {plan && (
        <>
          <h2>Series plan</h2>
          <p className="muted">{plan.series_summary}</p>
          {plan.episodes?.map((ep) => (
            <div className="card" key={ep.position}>
              <div className="card-title">{ep.position}. {ep.title}</div>
              <p className="small" style={{ margin: "6px 0" }}><b>Angle:</b> {ep.angle}</p>
              <p className="small" style={{ margin: "6px 0" }}><b>Drives towards:</b> {ep.thesis}</p>
              <p className="small muted" style={{ margin: "6px 0" }}>Owns {ep.owned_subtopics?.length || 0} of the {brief?.subtopics?.length || "?"} subtopics — nothing shared with the other episodes.</p>
            </div>
          ))}
        </>
      )}

      {brief && (
        <details className="plan">
          <summary>Research brief ({brief.subtopics?.length || 0} subtopics)</summary>
          <p className="muted">{brief.overview}</p>
          <pre>{brief.subtopics?.map((s) => `${s.id}  ${s.name}\n    ${s.summary}`).join("\n\n")}</pre>
        </details>
      )}

      <h2>Log</h2>
      <EventLog events={events} />
    </>
  );
}
