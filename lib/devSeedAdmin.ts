import { hashPassword } from "@/lib/auth/password";
import { isAdminEmail } from "@/lib/auth/admins";
import { isDevDatabaseEnabled } from "@/lib/devDb";
import { query } from "@/lib/db";
import { createUser, findUserByEmail } from "@/lib/repositories/users";

const DEFAULT_DEV_ADMIN_EMAIL = "sunzhangyi415@163.com";
const DEFAULT_DEV_ADMIN_PASSWORD = "dev123456";

export function devAdminCredentials(): {
  email: string;
  password: string;
} {
  return {
    email: (
      process.env.DEV_ADMIN_EMAIL?.trim() || DEFAULT_DEV_ADMIN_EMAIL
    ).toLowerCase(),
    password: process.env.DEV_ADMIN_PASSWORD?.trim() || DEFAULT_DEV_ADMIN_PASSWORD,
  };
}

let seeded = false;

export function resetDevAdminSeedFlag(): void {
  seeded = false;
}

/** Ensure local in-memory DB has a known admin login (dev only). */
export async function ensureDevAdminUser(): Promise<void> {
  if (!isDevDatabaseEnabled() || seeded) return;

  const { email, password } = devAdminCredentials();
  if (!isAdminEmail(email)) return;

  const passwordHash = await hashPassword(password);
  const existing = await findUserByEmail(email);

  if (existing) {
    await query(
      `UPDATE app_users
       SET password_hash = $1, is_admin = true, updated_at = NOW()
       WHERE LOWER(email) = LOWER($2)`,
      [passwordHash, email]
    );
  } else {
    await createUser({
      email,
      passwordHash,
      displayName: "Admin",
    });
  }

  seeded = true;
}
