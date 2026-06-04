import { NextResponse } from "next/server";
import { z } from "zod";
import { desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";
import { generateToken } from "@/lib/api-token";

const Body = z.object({
  name: z.string().min(1).max(60),
});

export async function GET() {
  await requireUser();
  const rows = await db
    .select({
      id: schema.apiTokens.id,
      name: schema.apiTokens.name,
      prefix: schema.apiTokens.prefix,
      createdAt: schema.apiTokens.createdAt,
      lastUsedAt: schema.apiTokens.lastUsedAt,
      revokedAt: schema.apiTokens.revokedAt,
    })
    .from(schema.apiTokens)
    .orderBy(desc(schema.apiTokens.createdAt));
  return NextResponse.json({ tokens: rows });
}

export async function POST(req: Request) {
  const user = await requireUser();
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const { plaintext, hash, prefix } = generateToken();
  const [row] = await db
    .insert(schema.apiTokens)
    .values({
      name: parsed.data.name,
      tokenHash: hash,
      prefix,
      createdById: user.id,
    })
    .returning({ id: schema.apiTokens.id });
  return NextResponse.json({
    id: row.id,
    token: plaintext, // shown ONCE
    prefix,
  });
}
