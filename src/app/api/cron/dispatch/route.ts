import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { dispatchPending } from "@/lib/send";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(req: Request): boolean {
  if (!env.CRON_SECRET) return true; // dev mode
  return req.headers.get("x-cron-secret") === env.CRON_SECRET;
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await dispatchPending();
  return NextResponse.json(result);
}

export const GET = POST;
