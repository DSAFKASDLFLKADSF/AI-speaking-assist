import { queryOne } from "@/lib/db";
import type { AppUser } from "@/lib/auth/types";

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  display_name: string | null;
  avatar_url: string | null;
  native_language: string;
  target_score: number;
  created_at: Date | string;
}

function mapUser(row: UserRow): AppUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    nativeLanguage: row.native_language,
    targetScore: row.target_score,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
  };
}

export async function findUserByEmail(
  email: string
): Promise<(AppUser & { passwordHash: string }) | null> {
  const row = await queryOne<UserRow>(
    `SELECT id, email, password_hash, display_name, avatar_url,
            native_language, target_score, created_at
     FROM app_users WHERE LOWER(email) = LOWER($1)`,
    [email.trim()]
  );
  if (!row) return null;
  return { ...mapUser(row), passwordHash: row.password_hash };
}

export async function findUserById(id: string): Promise<AppUser | null> {
  const row = await queryOne<UserRow>(
    `SELECT id, email, password_hash, display_name, avatar_url,
            native_language, target_score, created_at
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
  const row = await queryOne<UserRow>(
    `INSERT INTO app_users (email, password_hash, display_name)
     VALUES ($1, $2, $3)
     RETURNING id, email, password_hash, display_name, avatar_url,
               native_language, target_score, created_at`,
    [input.email.trim().toLowerCase(), input.passwordHash, input.displayName?.trim() || null]
  );

  if (!row) {
    throw new Error("Failed to create user.");
  }

  return mapUser(row);
}
