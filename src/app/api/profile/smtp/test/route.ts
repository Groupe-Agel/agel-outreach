import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth-helpers";
import { createUserSmtpTransport } from "@/lib/mail/transport";
import { decryptSecret } from "@/lib/secret-crypto";

const Body = z.object({
  smtpHost: z.string().min(1),
  smtpPort: z.coerce.number().int().min(1).max(65535),
  smtpSecure: z.boolean(),
  smtpUser: z.string().min(1),
  smtpPassword: z.string().optional(),
});

export async function POST(req: Request) {
  const me = await requireUser();
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 },
    );
  }
  const { smtpHost, smtpPort, smtpSecure, smtpUser, smtpPassword } = parsed.data;

  // Use the supplied password if present; otherwise fall back to the one
  // stored on the user (so "Test connection" works without re-typing).
  let pass = smtpPassword;
  if (!pass) {
    const row = await db.query.users.findFirst({ where: eq(users.id, me.id) });
    if (row?.smtpPassEncrypted) {
      try {
        pass = decryptSecret(row.smtpPassEncrypted);
      } catch {
        return NextResponse.json(
          { error: "Stored password could not be decrypted; please re-enter it." },
          { status: 400 },
        );
      }
    }
  }
  if (!pass) {
    return NextResponse.json(
      { error: "Password is required to test the connection." },
      { status: 400 },
    );
  }

  const transport = createUserSmtpTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    user: smtpUser,
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
