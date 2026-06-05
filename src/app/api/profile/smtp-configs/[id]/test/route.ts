import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { smtpConfigs } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth-helpers";
import { createUserSmtpTransport } from "@/lib/mail/transport";
import { decryptSecret } from "@/lib/secret-crypto";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await requireUser();
  const { id } = await params;

  const config = await db.query.smtpConfigs.findFirst({
    where: and(eq(smtpConfigs.id, id), eq(smtpConfigs.userId, me.id)),
  });
  if (!config) {
    return NextResponse.json({ error: "Config not found" }, { status: 404 });
  }

  let pass: string;
  try {
    pass = decryptSecret(config.passEncrypted);
  } catch {
    return NextResponse.json(
      { error: "Stored password could not be decrypted; please re-save it." },
      { status: 400 },
    );
  }

  const transport = createUserSmtpTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.smtpUser,
    pass,
  });
  try {
    await transport.verify();
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
