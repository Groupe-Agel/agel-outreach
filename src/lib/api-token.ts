import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export type GeneratedToken = {
  plaintext: string;
  hash: string;
  prefix: string;
};

export function generateToken(): GeneratedToken {
  const plaintext = "agel_" + randomBytes(24).toString("base64url");
  const hash = hashToken(plaintext);
  const prefix = plaintext.slice(0, 12);
  return { plaintext, hash, prefix };
}

export function hashToken(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
