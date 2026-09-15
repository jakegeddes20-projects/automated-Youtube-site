"use client";

export default function EventLog({ events }) {
  if (!events?.length) return <p className="muted small">Nothing logged yet.</p>;
  return (
    <ul className="log">
      {events.map((e) => (
        <li key={e.id}>
          <span className="t">{new Date(e.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          <span className={e.level}>{e.message}</span>
        </li>
      ))}
    </ul>
  );
}
