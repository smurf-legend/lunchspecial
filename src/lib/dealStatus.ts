// Current vs. expired is never stored — it's derived here from expiresAt
// vs. now, so status is always correct without a background job.
export function isExpired(expiresAt: Date | string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}

export function formatExpiry(expiresAt: Date | string): string {
  return new Date(expiresAt).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
