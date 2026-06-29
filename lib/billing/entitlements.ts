import type { AppUser, PublicUser } from "@/lib/auth/types";
import { isAdminUser } from "@/lib/auth/admins";

/** Admins (and future comp accounts) skip payment checks. */
export function hasPremiumAccess(
  user: AppUser | PublicUser | null | undefined
): boolean {
  if (!user) return false;
  return isAdminUser(user);
}

/** Placeholder for paid credits — always true until billing ships, except we enforce login optionally later. */
export function canUseScoring(
  user: AppUser | PublicUser | null | undefined
): boolean {
  if (hasPremiumAccess(user)) return true;
  // TODO: check user_entitlements.credits when billing is live
  return true;
}
