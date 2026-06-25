const env = process.env as Record<string, string | undefined>;
env.NODE_ENV = "development";
env.AUTH_SECRET = env.AUTH_SECRET ?? "dev-test";
delete env.DATABASE_URL;
import { query } from "../lib/db";
import { createUser } from "../lib/repositories/users";
import { hashPassword } from "../lib/auth/password";

async function main() {
  const rows = await query<{ ok: number }>("SELECT 1 as ok");
  console.log("query:", rows);

  const hash = await hashPassword("testpass123");
  const user = await createUser({
    email: `test-${Date.now()}@example.com`,
    passwordHash: hash,
  });
  console.log("created user:", user.email);
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
