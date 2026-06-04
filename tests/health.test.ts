import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    execute: vi.fn(),
  },
}));

const { db } = await import("@/lib/db");
const { GET } = await import("@/app/api/health/route");

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.mocked(db.execute).mockReset();
  });

  it("returns 200 with ok:true when the DB query succeeds", async () => {
    vi.mocked(db.execute).mockResolvedValueOnce([{ "?column?": 1 }] as never);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      ok: true,
      sha: expect.any(String),
      db: "up",
    });
  });

  it("returns 503 with ok:false when the DB query throws", async () => {
    vi.mocked(db.execute).mockRejectedValueOnce(new Error("connection refused"));
    const res = await GET();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body).toEqual({ ok: false, db: "down" });
  });
});
