import { Resend } from "resend";
import { env } from "@/lib/env";

let _resend: Resend | null = null;

export function resend(): Resend {
  if (!_resend) {
    if (!env.RESEND_API_KEY) {
      throw new Error(
        "RESEND_API_KEY is not set. Configure it in .env.local before sending.",
      );
    }
    _resend = new Resend(env.RESEND_API_KEY);
  }
  return _resend;
}
