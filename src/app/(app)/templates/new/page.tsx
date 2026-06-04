import { TemplateEditor } from "@/components/TemplateEditor";
import { requireUser } from "@/lib/auth-helpers";
import { DEFAULT_MJML } from "@/lib/templates/defaults";
import { PageHeader } from "@/components/ui/PageHeader";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

export default async function NewTemplatePage() {
  await requireUser();
  return (
    <div>
      <PageHeader
        breadcrumb={
          <Link
            href="/templates"
            style={{ color: "var(--color-maroon-700)", display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Icon name="arrowLeft" size={12} /> Templates
          </Link>
        }
        title="New template"
        subtitle="MJML source on the left, live preview on the right. Save when you're ready to use it in a campaign."
      />
      <TemplateEditor
        initial={{
          name: "",
          description: "",
          subjectTpl: "Programme AGEL — {{organization}}",
          mjmlSource: DEFAULT_MJML,
        }}
      />
    </div>
  );
}
