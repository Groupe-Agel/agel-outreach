import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { env } from "@/lib/env";
import { createHmac, timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";

type ResendEvent = {
  type: string;
  data: {
    email_id?: string;
    [k: string]: unknown;
  };
};

function verifySignature(req: Request, raw: string): boolean {
  if (!env.RESEND_WEBHOOK_SECRET) return true; // dev mode: accept anything
  // Resend uses Svix-style signatures; minimal verification here.
  const id = req.headers.get("svix-id") ?? "";
  const timestamp = req.headers.get("svix-timestamp") ?? "";
  const sigHeader = req.headers.get("svix-signature") ?? "";
  if (!id || !timestamp || !sigHeader) return false;

  const signedPayload = `${id}.${timestamp}.${raw}`;
  const secret = env.RESEND_WEBHOOK_SECRET.replace(/^whsec_/, "");
  const expected = createHmac("sha256", Buffer.from(secret, "base64"))
    .update(signedPayload)
    .digest("base64");

  return sigHeader
    .split(" ")
    .some((p) => {
      const v = p.split(",")[1];
      if (!v) return false;
      try {
        return timingSafeEqual(Buffer.from(v), Buffer.from(expected));
      } catch {
        return false;
      }
    });
}

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifySignature(req, raw)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  let event: ResendEvent;
  try {
    event = JSON.parse(raw) as ResendEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const resendId = event.data?.email_id;
  if (!resendId) return NextResponse.json({ ok: true });

  const recipient = await db.query.recipients.findFirst({
    where: eq(schema.recipients.resendId, resendId),
  });
  if (!recipient) return NextResponse.json({ ok: true });

  const now = new Date();
  switch (event.type) {
    case "email.delivered":
      await db
        .update(schema.recipients)
        .set({ status: "DELIVERED", deliveredAt: now })
        .where(eq(schema.recipients.id, recipient.id));
      break;
    case "email.opened":
      if (!recipient.openedAt) {
        await db
          .update(schema.recipients)
          .set({ status: "OPENED", openedAt: now })
          .where(eq(schema.recipients.id, recipient.id));
        await db
          .update(schema.campaigns)
          .set({ openedCount: sql`${schema.campaigns.openedCount} + 1` })
          .where(eq(schema.campaigns.id, recipient.campaignId));
      }
      break;
    case "email.bounced":
      await db
        .update(schema.recipients)
        .set({
          status: "BOUNCED",
          bouncedAt: now,
          errorMessage: String(event.data?.bounce ?? ""),
        })
        .where(eq(schema.recipients.id, recipient.id));
      break;
    case "email.complained":
      await db
        .update(schema.recipients)
        .set({ status: "COMPLAINED" })
        .where(eq(schema.recipients.id, recipient.id));
      break;
  }
  return NextResponse.json({ ok: true });
}
