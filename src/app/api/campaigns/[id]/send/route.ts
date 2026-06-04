import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";
import { sendCampaign } from "@/lib/send";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireUser();
  const { id } = await params;

  const c = await db.query.campaigns.findFirst({
    where: eq(schema.campaigns.id, id),
  });
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (c.scheduledAt && c.scheduledAt > new Date()) {
    await db
      .update(schema.campaigns)
      .set({ status: "SCHEDULED" })
      .where(eq(schema.campaigns.id, id));
    return NextResponse.json({ scheduled: true, scheduledAt: c.scheduledAt });
  }

  // Mark scheduled briefly so the dispatcher can pick it up if we time out
  await db
    .update(schema.campaigns)
    .set({ status: "SCHEDULED" })
    .where(eq(schema.campaigns.id, id));

  try {
    const result = await sendCampaign(id);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
