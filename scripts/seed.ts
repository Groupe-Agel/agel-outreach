import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/lib/db/schema";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });
const db = drizzle(sql, { schema });

try {
  // TODO: replace this with real seed data.
  // Example:
  // await db.insert(schema.users).values({
  //   email: "admin@agelpartners.com",
  //   role: "SUPERADMIN",
  // }).onConflictDoNothing();

  console.log("seed completed");
} finally {
  await sql.end();
}
