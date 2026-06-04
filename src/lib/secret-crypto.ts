import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { env } from "@/lib/env";

const ALGO = "aes-256-gcm";
const IV_BYTES = 12;

function key(): Buffer {
  return createHash("sha256").update(env.AUTH_SECRET).digest();
}

export function encryptSecret(plaintext: string): string {
  if (typeof plaintext !== "string" || plaintext.length === 0) {
    throw new Error("plaintext must be a non-empty string");
  }
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${ciphertext.toString("base64")}.${tag.toString("base64")}`;
}

export function decryptSecret(packed: string): string {
  const parts = packed.split(".");
  if (parts.length !== 3) throw new Error("malformed encrypted secret");
  const iv = Buffer.from(parts[0], "base64");
  const ciphertext = Buffer.from(parts[1], "base64");
  const tag = Buffer.from(parts[2], "base64");
  const decipher = createDecipheriv(ALGO, key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
    "utf8",
  );
}
