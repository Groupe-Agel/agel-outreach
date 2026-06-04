import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import { hashPassword } from "../src/lib/password";
import * as schema from "../src/lib/db/schema";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const ADMIN_EMAIL = "admin@groupe-agel.com";
const ADMIN_PASSWORD = "ChangeMe!2026";

const sql = postgres(url, { max: 1 });
const db = drizzle(sql, { schema });

try {
  const existing = await db.query.users.findFirst({
    where: eq(schema.users.email, ADMIN_EMAIL),
  });

  if (existing) {
    console.log(`admin user ${ADMIN_EMAIL} already exists — skipping`);
  } else {
    await db.insert(schema.users).values({
      email: ADMIN_EMAIL,
      name: "AGEL Admin",
      role: "SUPERADMIN",
      passwordHash: hashPassword(ADMIN_PASSWORD),
    });
    console.log(`created admin user ${ADMIN_EMAIL} with password ${ADMIN_PASSWORD}`);
    console.log("change this password from the profile page after first login.");
  }
} finally {
  await sql.end();
}
