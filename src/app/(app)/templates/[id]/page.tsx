import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { templates } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth-helpers";
import { TemplateEditor } from "@/components/TemplateEditor";
import { PageHeader } from "@/components/ui/PageHeader";
import { Icon } from "@/components/ui/Icon";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const t = await db.query.templates.findFirst({
    where: eq(templates.id, id),
  });
  if (!t) notFound();

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
        title={t.name}
        subtitle={t.description ?? "Edit MJML source and preview live."}
      />
      <TemplateEditor
        id={t.id}
        initial={{
          name: t.name,
          description: t.description ?? "",
          subjectTpl: t.subjectTpl,
          mjmlSource: t.mjmlSource,
        }}
      />
    </div>
  );
}
