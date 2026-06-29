import type { AppUser, PublicUser } from "@/lib/auth/types";

const DEFAULT_ADMIN_EMAILS = ["sunzhangyi415@163.com"];

function adminEmailSet(): Set<string> {
  const fromEnv = process.env.ADMIN_EMAILS?.split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const list = fromEnv?.length ? fromEnv : DEFAULT_ADMIN_EMAILS;
  return new Set(list);
}

export function isAdminEmail(email: string): boolean {
  return adminEmailSet().has(email.trim().toLowerCase());
}

export function isAdminUser(
  user: Pick<AppUser | PublicUser, "email" | "isAdmin">
): boolean {
  return Boolean(user.isAdmin) || isAdminEmail(user.email);
}
