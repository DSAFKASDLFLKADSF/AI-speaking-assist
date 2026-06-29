import { queryOne, query } from "@/lib/db";
import type { AppUser } from "@/lib/auth/types";
import { isAdminEmail } from "@/lib/auth/admins";

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  display_name: string | null;
  avatar_url: string | null;
  native_language: string;
  target_score: number;
  is_admin?: boolean;
  created_at: Date | string;
}

function mapUser(row: UserRow): AppUser {
  const email = row.email;
  return {
    id: row.id,
    email,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    nativeLanguage: row.native_language,
    targetScore: row.target_score,
    isAdmin: Boolean(row.is_admin) || isAdminEmail(email),
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
  };
}

async function syncAdminFlag(userId: string, email: string): Promise<void> {
  if (!isAdminEmail(email)) return;
  try {
    await query(
      `UPDATE app_users SET is_admin = true, updated_at = NOW() WHERE id = $1 AND is_admin = false`,
      [userId]
    );
  } catch {
    // Column may not exist before migration 002
  }
}

export async function findUserByEmail(
  email: string
): Promise<(AppUser & { passwordHash: string }) | null> {
  const row = await queryOne<UserRow>(
    `SELECT id, email, password_hash, display_name, avatar_url,
            native_language, target_score, is_admin, created_at
     FROM app_users WHERE LOWER(email) = LOWER($1)`,
    [email.trim()]
  );
  if (!row) return null;
  await syncAdminFlag(row.id, row.email);
  return { ...mapUser(row), passwordHash: row.password_hash };
}

export async function findUserById(id: string): Promise<AppUser | null> {
  const row = await queryOne<UserRow>(
    `SELECT id, email, password_hash, display_name, avatar_url,
            native_language, target_score, is_admin, created_at
     FROM app_users WHERE id = $1`,
    [id]
  );
  if (!row) return null;
  return mapUser(row);
}
export async function createUser(input: {
  email: string;
  passwordHash: string;
  displayName?: string | null;
}): Promise<AppUser> {
  const email = input.email.trim().toLowerCase();
  const admin = isAdminEmail(email);
  const row = await queryOne<UserRow>(
    `INSERT INTO app_users (email, password_hash, display_name, is_admin)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, password_hash, display_name, avatar_url,
               native_language, target_score, is_admin, created_at`,
    [email, input.passwordHash, input.displayName?.trim() || null, admin]
  );

  if (!row) {
    throw new Error("Failed to create user.");
  }

  return mapUser(row);
}
