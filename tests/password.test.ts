import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("password", () => {
  it("hash and verify round-trip", () => {
    const stored = hashPassword("hunter2pass");
    expect(stored).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);
    expect(verifyPassword("hunter2pass", stored)).toBe(true);
  });

  it("different hashes for same password (salted)", () => {
    const a = hashPassword("samepass!");
    const b = hashPassword("samepass!");
    expect(a).not.toBe(b);
    expect(verifyPassword("samepass!", a)).toBe(true);
    expect(verifyPassword("samepass!", b)).toBe(true);
  });

  it("rejects wrong password", () => {
    const stored = hashPassword("correct_horse_battery_staple");
    expect(verifyPassword("wrong", stored)).toBe(false);
  });

  it("rejects malformed stored values", () => {
    expect(verifyPassword("anything", "")).toBe(false);
    expect(verifyPassword("anything", "missing-colon")).toBe(false);
    expect(verifyPassword("anything", "salt:")).toBe(false);
  });

  it("rejects empty password on hash", () => {
    expect(() => hashPassword("")).toThrow();
  });
});
