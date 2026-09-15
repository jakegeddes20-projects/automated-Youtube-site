import Library from "../../components/Library";

export default function Page() {
  return (
    <main>
      <h1>Library</h1>
      <p className="subtitle">Every finished episode, newest first. Files live on your PC in the folder shown on each episode.</p>
      <Library />
    </main>
  );
}
