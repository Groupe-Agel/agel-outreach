import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { env } from "@/lib/env";

const PUBLIC_PATHS = ["/login"];
const PUBLIC_PREFIXES = [
  "/api/auth", // NextAuth handlers
  "/api/v1", // token-protected REST API
  "/api/webhooks", // Resend webhooks
  "/api/cron", // cron-secret protected
  "/_next",
  "/favicon",
];

export async function proxy(req: NextRequest) {
  if (env.DEV_SKIP_AUTH) return NextResponse.next();

  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p)))
    return NextResponse.next();

  const session = await auth();
  if (!session?.user) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
