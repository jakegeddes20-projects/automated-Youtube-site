"use client";

import { useEffect, useState } from "react";

function Badge({ label, ready }) {
  return <span className={`badge ${ready ? "ready" : "pending"}`}>{label}</span>;
}

function JobCard({ job }) {
  return (
    <div className="job-card">
      <div className="job-topic">{job.topic}</div>
      <div className="stage-row">
        <Badge label="Script" ready={job.status === "script_ready"} />
        <Badge label="Voice-over" ready={job.voiceover_status === "done"} />
        <Badge label="Image/Video" ready={job.video_status === "done"} />
        <Badge label="Published" ready={job.publish_status === "done"} />
      </div>
      {job.script && <pre className="script">{job.script}</pre>}
      {job.voiceover_status === "done" && (
        <audio controls src={`/api/audio/${job.id}`} style={{ width: "100%", marginTop: "8px" }} />
      )}
    </div>
  );
}

export default function Dashboard() {
  const [jobs, setJobs] = useState([]);
  const [topic, setTopic] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function loadJobs() {
    try {
      const res = await fetch("/api/jobs");
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch (err) {
      setError("Could not load jobs.");
    }
  }

  useEffect(() => {
    loadJobs();
    const interval = setInterval(loadJobs, 5000);
    return () => clearInterval(interval);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!topic.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create job");
      }
      setTopic("");
      await loadJobs();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Topic, e.g. 'Why the Jedi Order was doomed from the start'"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
        <button type="submit" disabled={submitting}>
          {submitting ? "Creating..." : "Create job"}
        </button>
      </form>

      {error && <p style={{ color: "#f87171" }}>{error}</p>}

      {jobs.length === 0 ? (
        <p className="subtitle">No jobs yet — submit a topic above to create one.</p>
      ) : (
        jobs.map((job) => <JobCard key={job.id} job={job} />)
      )}
    </div>
  );
}
