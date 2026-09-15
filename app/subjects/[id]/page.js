import SubjectDetail from "../../../components/SubjectDetail";

export default function Page({ params }) {
  return (
    <main>
      <SubjectDetail id={params.id} />
    </main>
  );
}
