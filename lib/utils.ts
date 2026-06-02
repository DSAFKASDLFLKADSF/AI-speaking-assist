/**
 * Merge class names conditionally.
 */
export function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Get a required environment variable or throw.
 */
export function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}

/**
 * Get a public env var with a fallback.
 */
export function getPublicEnv(key: string, fallback = ""): string {
  return process.env[key] ?? fallback;
}
