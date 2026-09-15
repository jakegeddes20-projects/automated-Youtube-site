import SettingsForm from "../../components/SettingsForm";

export default function Page() {
  return (
    <main>
      <h1>Settings</h1>
      <p className="subtitle">Defaults for new subjects. You can still change them per subject on the queue page.</p>
      <SettingsForm />
    </main>
  );
}
