import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { testSendToSelf } from "@/lib/send";

const Body = z.object({
  templateId: z.string().min(1),
  subjectTpl: z.string().min(1),
  fromName: z.string().min(1),
  replyTo: z.string().email(),
  sampleData: z.record(z.string(), z.unknown()).default({}),
});

export async function POST(req: Request) {
  const user = await requireUser();
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  try {
    const result = await testSendToSelf({
      ...parsed.data,
      toEmail: user.email,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
