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

// Same idea as Facebook's share links — vt.tiktok.com/{code}/ short links
// (the form TikTok's own share sheet generates) redirect fine for a normal
// browser visit, but tiktokEmbedUrl in articleBlocks.ts matches on the
// canonical tiktok.com/@user/video/{id} path, which a short link never
// contains. Resolving first means a pasted share link embeds correctly
// instead of getting rejected as unrecognized.
async function resolveTikTokShortLink(url: string): Promise<string> {
  if (!/vt\.tiktok\.com\//.test(url)) return url;

  try {
    const res = await fetch(url, { redirect: "manual" });
    const location = res.headers.get("location");
    if (!location) return url;
    const resolved = new URL(location, url);
    resolved.search = "";
    return resolved.toString();
  } catch {
    return url;
  }
}

async function resolveVideoUrl(url: string): Promise<string> {
  return resolveTikTokShortLink(await resolveFacebookShareLink(url));
}

export async function resolveVideoUrls(urls: string[]): Promise<string[]> {
  return Promise.all(urls.map(resolveVideoUrl));
}
