"use client";

export default function WorkerPill({ worker }) {
  if (!worker) return <span className="pill"><span className="dot" />Checking PC…</span>;
  if (!worker.online) {
    return (
      <span className="pill offline" title="Start the worker on your PC (double-click start-worker.bat)">
        <span className="dot" />PC offline
      </span>
    );
  }
  return (
    <span className="pill online" title={worker.hostname || ""}>
      <span className="dot" />PC online
      {worker.current_task && <span className="task">· {worker.current_task}</span>}
    </span>
  );
}
