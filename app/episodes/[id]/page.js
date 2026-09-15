import EpisodeDetail from "../../../components/EpisodeDetail";

export default function Page({ params }) {
  return (
    <main>
      <EpisodeDetail id={params.id} />
    </main>
  );
}
