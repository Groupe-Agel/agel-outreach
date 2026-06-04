import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";
import { testSendToSelf } from "@/lib/send";

const Body = z.object({
  sampleData: z.record(z.string(), z.unknown()).default({}),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  const sampleData = parsed.success ? parsed.data.sampleData : {};

  const c = await db.query.campaigns.findFirst({
    where: eq(schema.campaigns.id, id),
    with: { recipients: { limit: 1 } },
  });
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data =
    Object.keys(sampleData).length > 0
      ? sampleData
      : ((c.recipients[0]?.mergeData ?? {}) as Record<string, unknown>);

  try {
    const result = await testSendToSelf({
      templateId: c.templateId,
      subjectTpl: c.subjectTpl,
      fromName: c.fromName,
      replyTo: c.replyTo,
      sampleData: data,
      toEmail: user.email,
      userId: c.createdById ?? user.id,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
