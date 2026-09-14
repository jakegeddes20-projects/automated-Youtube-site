import Dashboard from "../components/Dashboard";

export default function Page() {
  return (
    <main>
      <h1>Content Pipeline Agent</h1>
      <p className="subtitle">
        Research → script → voice-over → video → publish. Voice/image/video
        generation and YouTube publishing plug in as later phases — for now,
        submitting a topic creates a job with a free placeholder script.
      </p>
      <Dashboard />
    </main>
  );
}
