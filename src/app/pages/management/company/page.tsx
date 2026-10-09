import CompanySettingsForm from "@/components/forms/CompanySettingsForm";

export default function CompanySettingsPage() {
  return (
    <main className="flex flex-col items-center p-2 gap-2">
        <h1 className="font-bold text-4xl">Company Settings</h1>
      <CompanySettingsForm />
    </main>
  );
}