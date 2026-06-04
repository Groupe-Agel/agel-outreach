import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { parseFile } from "@/lib/parsers";

export const runtime = "nodejs";

export async function POST(req: Request) {
  await requireUser();
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  try {
    const result = await parseFile(file);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
