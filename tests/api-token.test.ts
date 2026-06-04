import { describe, it, expect } from "vitest";
import { generateToken, hashToken, safeEqual } from "@/lib/api-token";

describe("api-token", () => {
  it("generates unique tokens with consistent hashes", () => {
    const a = generateToken();
    const b = generateToken();
    expect(a.plaintext).not.toBe(b.plaintext);
    expect(a.hash).not.toBe(b.hash);
    expect(a.plaintext).toMatch(/^agel_/);
    expect(a.prefix).toHaveLength(12);
    expect(hashToken(a.plaintext)).toBe(a.hash);
  });

  it("safeEqual is constant-time and exact", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});
