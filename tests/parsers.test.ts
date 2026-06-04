import { describe, it, expect } from "vitest";
import { normalizeContacts } from "@/lib/parsers";

describe("normalizeContacts", () => {
  const sample = [
    {
      full_name: "ZAIRIG IMAD",
      email: "imad@ouifork.com",
      organization: "Ouifork",
      job_title: "CEO",
    },
    {
      full_name: "Charaf Karcha",
      email: "charaf.karcha@groupe-agel.com",
      organization: "Groupe AGEL",
      job_title: null,
    },
    {
      full_name: "broken row",
      email: "not-an-email",
      organization: "X",
    },
  ];

  it("normalizes rows and flags invalid emails", () => {
    const result = normalizeContacts(sample);
    expect(result.rows).toHaveLength(2);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].row).toBe(3);
    expect(result.rows[0].email).toBe("imad@ouifork.com");
    expect(result.columns).toContain("organization");
  });

  it("rejects non-array input", () => {
    expect(() => normalizeContacts({ not: "array" })).toThrow();
  });
});
