const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(s: unknown): s is string {
  return typeof s === "string" && EMAIL_RE.test(s.trim());
}

export function normalizeEmail(s: string): string {
  return s.trim().toLowerCase();
}
