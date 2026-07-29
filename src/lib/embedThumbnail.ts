import { socialEmbedUrl } from "@/lib/articleBlocks";

async function fetchJson(url: string, timeoutMs = 4000): Promise<any | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Best-effort real preview thumbnail for a video's click-to-load placeholder
// — only for platforms with a free, unauthenticated way to get one.
// YouTube's thumbnail is just a static URL pattern (no API call at all).
// Vimeo and TikTok both have a public oEmbed endpoint that returns one.
// Instagram/X/Facebook's oEmbed now requires a Meta developer app access
// token, which isn't set up here, so those fall back to a plain branded
// placeholder (handled by the caller) rather than a real preview image —
// the main fix (the iframe not loading until clicked) still applies
// regardless of whether a thumbnail is available.
export async function getEmbedThumbnail(url: string): Promise<string | null> {
  const embed = socialEmbedUrl(url);
  if (!embed) return null;

  switch (embed.platform) {
    case "youtube": {
      const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
      return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : null;
    }
    case "vimeo": {
      const data = await fetchJson(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`);
      return data?.thumbnail_url ?? null;
    }
    case "tiktok": {
      const data = await fetchJson(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
      return data?.thumbnail_url ?? null;
    }
    default:
      return null;
  }
}
