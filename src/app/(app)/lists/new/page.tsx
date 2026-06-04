import { requireUser } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/ui/PageHeader";
import { NewListForm } from "@/components/NewListForm";

export default async function NewListPage() {
  await requireUser();
  return (
    <div>
      <PageHeader
        eyebrow="Audiences"
        title="New contact list"
        subtitle="Upload a .json, .csv, or .xlsx file. We'll dedupe by email and save the list for reuse."
      />
      <NewListForm />
    </div>
  );
}
