import { describe, it, expect } from "vitest";
import { isValidEmail, normalizeEmail } from "@/lib/email";

describe("isValidEmail", () => {
  it("accepts standard addresses", () => {
    expect(isValidEmail("yassine.afaila@groupe-agel.com")).toBe(true);
    expect(isValidEmail("a@b.co")).toBe(true);
  });

  it("rejects malformed strings", () => {
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidEmail("a@b")).toBe(false);
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("  spaces inside @b.com")).toBe(false);
  });

  it("rejects non-strings", () => {
    expect(isValidEmail(null)).toBe(false);
    expect(isValidEmail(123)).toBe(false);
    expect(isValidEmail(undefined)).toBe(false);
  });
});

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Foo@Bar.COM ")).toBe("foo@bar.com");
  });
});
