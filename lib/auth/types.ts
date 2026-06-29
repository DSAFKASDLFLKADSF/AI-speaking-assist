export interface AppUser {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  nativeLanguage: string;
  targetScore: number;
  isAdmin: boolean;
  createdAt: string;
}

export interface PublicUser {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
}

export function toPublicUser(user: AppUser): PublicUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    isAdmin: user.isAdmin,
  };
}
