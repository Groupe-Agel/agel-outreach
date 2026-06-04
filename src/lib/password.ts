import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

const KEYLEN = 64;
const SCRYPT_N = 16384; // 2^14, ~30ms on modern hardware
const SALT_BYTES = 16;

/**
 * Returns a stored password representation: "salt:keyHex".
 * Uses Node's built-in scrypt — no native deps needed.
 */
export function hashPassword(plaintext: string): string {
  if (typeof plaintext !== "string" || plaintext.length === 0) {
    throw new Error("password must be a non-empty string");
  }
  const salt = randomBytes(SALT_BYTES).toString("hex");
  const key = scryptSync(plaintext, salt, KEYLEN, { N: SCRYPT_N });
  return `${salt}:${key.toString("hex")}`;
}

export function verifyPassword(plaintext: string, stored: string): boolean {
  if (!stored || typeof stored !== "string") return false;
  const [salt, keyHex] = stored.split(":");
  if (!salt || !keyHex) return false;
  let candidate: Buffer;
  try {
    candidate = scryptSync(plaintext, salt, KEYLEN, { N: SCRYPT_N });
  } catch {
    return false;
  }
  const stored_buf = Buffer.from(keyHex, "hex");
  if (candidate.length !== stored_buf.length) return false;
  return timingSafeEqual(candidate, stored_buf);
}
