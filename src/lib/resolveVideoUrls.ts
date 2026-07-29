// Facebook's short share links (facebook.com/share/r/{code}/, /share/v/...,
// /share/p/...) redirect to the real canonical post/reel URL, but that
// redirect only happens for a normal browser navigation — Facebook's own
// embed plugin (plugins/video.php / plugins/post.php, see facebookEmbedUrl
// in articleBlocks.ts) can't resolve it server-side and just shows "this
// content isn't available", even though the link works fine if you click
// it directly. Resolving to the canonical URL before saving fixes the
// embed without the visitor ever seeing the difference.
async function resolveFacebookShareLink(url: string): Promise<string> {
  if (!/facebook\.com\/share\//.test(url)) return url;

  try {
    const res = await fetch(url, { redirect: "manual" });
    const location = res.headers.get("location");
    if (!location) return url;
    // Strip Facebook's tracking params (rdid, share_url) — only the path
    // is needed to identify the post/reel.
    const resolved = new URL(location, url);
    resolved.search = "";
    return resolved.toString();
  } catch {
    // Network hiccup or Facebook changed behavior — keep the original link
    // rather than block saving the special over a best-effort cleanup.
    return url;
  }
}

export async function resolveVideoUrls(urls: string[]): Promise<string[]> {
  return Promise.all(urls.map(resolveFacebookShareLink));
}
