// Same "no background job" pattern as isExpired in dealStatus.ts — whether
// a post is still a scheduled draft is derived from publishAt vs. now at
// query/render time, not stored as a separate status.
export function isScheduled(publishAt: Date | string | null): boolean {
  if (!publishAt) return false;
  return new Date(publishAt).getTime() > Date.now();
}

export function formatScheduled(publishAt: Date | string): string {
  return new Date(publishAt).toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
