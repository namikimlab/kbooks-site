// lib/env.ts

/**
 * Fetch a required environment variable. Treats empty strings as "missing"
 * so misconfigured deployments fail loudly instead of behaving unpredictably.
 */
export function requireServerEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

/**
 * Fetch an optional environment variable. Empty strings are normalised to
 * undefined so callers can coalesce to defaults without extra checks.
 */
export function getOptionalServerEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
}

/**
 * Resolve a base URL for server-side fetches back into this application.
 * Prefers the explicit NEXT_PUBLIC_SITE_URL and falls back to localhost.
 */
export function getSiteBaseUrl(): string {
  return (
    getOptionalServerEnv("NEXT_PUBLIC_SITE_URL") ??
    "http://localhost:3000"
  );
}
