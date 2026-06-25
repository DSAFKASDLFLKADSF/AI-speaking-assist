process.env.NODE_ENV = "development";
process.env.AUTH_SECRET = process.env.AUTH_SECRET ?? "dev-test";

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
