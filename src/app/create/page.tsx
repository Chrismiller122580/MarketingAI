import { AppShell } from "@/components/app-shell";
import { CreateChooser } from "@/components/create-chooser";

export default function CreatePage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <CreateChooser />
      </div>
    </AppShell>
  );
}
