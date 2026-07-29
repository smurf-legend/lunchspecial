// Article bodies are still plain text (no rich-text editor/dependency), but
// support two special block forms on their own line, surrounded by blank
// lines like any paragraph break:
//   ![alt text](https://image-url)         -> inline image
//   https://www.youtube.com/watch?v=xyz    -> embedded video/post (YouTube,
//                                              Vimeo, Instagram, X/Twitter,
//                                              TikTok, Facebook)
// Everything else renders as a plain paragraph, same as before.
export type SocialPlatform = "youtube" | "vimeo" | "instagram" | "twitter" | "tiktok" | "facebook";

// Hard cap on video/review links per Special. Confirmed in production:
// loading 3 TikTok embeds on one page is unreliable even with click-to-load
// deferring the iframe until clicked — one specific video would neither
// autoplay nor start on click, apparently a genuine practical limit on
// TikTok's side rather than a same-page-loading-order issue. Capping at 2
// avoids the failure mode outright instead of trying to work around it.
export const MAX_SPECIAL_VIDEOS = 2;

export type ArticleBlock =
  | { type: "paragraph"; text: string }
  | { type: "image"; src: string; alt: string }
  | { type: "embed"; platform: SocialPlatform; embedUrl: string };

const IMAGE_RE = /^!\[(.*)\]\((\S+)\)$/;

function youtubeEmbedUrl(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

function vimeoEmbedUrl(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? `https://player.vimeo.com/video/${m[1]}` : null;
}

// Instagram's own embed path — works as a plain iframe src, no widgets.js
// needed. Covers both feed posts (/p/) and Reels (/reel/). "captioned"
// renders the caption text inside the iframe itself — without it the embed
// relies on Instagram's own JS to resize the iframe to fit content (which
// a bare iframe src doesn't get), and cuts off with no scrollbar instead.
function instagramEmbedUrl(url: string): string | null {
  const m = url.match(/instagram\.com\/(p|reel)\/([\w-]+)/);
  return m ? `https://www.instagram.com/${m[1]}/${m[2]}/embed/captioned` : null;
}

// The iframe X/Twitter's own widgets.js loads under the hood — using it
// directly avoids pulling in their external script for a single embed.
function twitterEmbedUrl(url: string): string | null {
  const m = url.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/);
  return m ? `https://platform.twitter.com/embed/Tweet.html?id=${m[1]}` : null;
}

// Same idea as Instagram/Twitter: TikTok's embed.js hydrates a blockquote
// into an iframe pointing at this exact URL, so skip the script tag.
function tiktokEmbedUrl(url: string): string | null {
  const m = url.match(/tiktok\.com\/@[\w.-]+\/video\/(\d+)/);
  return m ? `https://www.tiktok.com/embed/v2/${m[1]}` : null;
}

// Facebook's plugin iframe takes the target post/video URL as a query param
// rather than extracting an ID — it resolves the href server-side.
function facebookEmbedUrl(url: string): string | null {
  if (!/^https?:\/\/(www\.)?facebook\.com\/.+/.test(url)) return null;
  const isVideo = /\/videos?\//.test(url);
  const base = isVideo ? "https://www.facebook.com/plugins/video.php" : "https://www.facebook.com/plugins/post.php";
  return `${base}?href=${encodeURIComponent(url)}&show_text=true`;
}

const PLATFORM_MATCHERS: [SocialPlatform, (url: string) => string | null][] = [
  ["youtube", youtubeEmbedUrl],
  ["vimeo", vimeoEmbedUrl],
  ["instagram", instagramEmbedUrl],
  ["twitter", twitterEmbedUrl],
  ["tiktok", tiktokEmbedUrl],
  ["facebook", facebookEmbedUrl],
];

// Returns the embed iframe src plus which platform matched, or null if the
// URL isn't a recognized post/video link from any supported platform.
export function socialEmbedUrl(url: string): { platform: SocialPlatform; embedUrl: string } | null {
  for (const [platform, matcher] of PLATFORM_MATCHERS) {
    const embedUrl = matcher(url);
    if (embedUrl) return { platform, embedUrl };
  }
  return null;
}

// Kept for existing callers (e.g. BlogForm's "paste a link" validation
// message) that only care about the video-site subset.
export function videoEmbedUrl(url: string): string | null {
  return youtubeEmbedUrl(url) || vimeoEmbedUrl(url);
}

export const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  youtube: "YouTube",
  vimeo: "Vimeo",
  instagram: "Instagram",
  twitter: "X",
  tiktok: "TikTok",
  facebook: "Facebook",
};

// Shared between ArticleBody (Table Talk embeds) and SocialEmbed (Special
// video/review links) so both size embeds identically. YouTube/Vimeo are
// always exactly 16:9, so a fixed aspect-ratio box is correct for them.
// TikTok/Instagram/Twitter/Facebook are not — TikTok's embed page has its
// own username/caption/like-count chrome around the video, which is taller
// than the raw 9:16 clip, and that height genuinely varies per post since
// caption length differs. TikTok's own embed.js corrects for this with a
// postMessage handshake that resizes the iframe to the actual content
// height, but this codebase deliberately skips loading that script for a
// single bare-iframe embed — so instead all four of these get the same
// explicit, generously tall fixed height rather than an aspect-ratio box
// that would crop or letterbox them. A *min*-height doesn't work here,
// since percentage heights (the iframe's h-full) don't resolve against a
// parent whose height is only a minimum, and the iframe silently collapses
// instead of growing to fill it.
export function embedContainerClass(platform: SocialPlatform): string {
  switch (platform) {
    case "youtube":
    case "vimeo":
      return "aspect-video w-full";
    case "tiktok":
      return "w-full h-[740px] max-w-sm mx-auto";
    case "instagram":
    case "twitter":
    case "facebook":
      return "w-full h-[720px] max-w-lg mx-auto";
  }
}

export function parseArticleBlocks(body: string): ArticleBlock[] {
  return body
    .split(/\n\s*\n/)
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((block): ArticleBlock => {
      const imgMatch = block.match(IMAGE_RE);
      if (imgMatch) return { type: "image", alt: imgMatch[1], src: imgMatch[2] };

      // Only treat a block as an embed if it's nothing but the URL — a
      // sentence that happens to mention a link stays a paragraph.
      if (/^\S+$/.test(block)) {
        const embed = socialEmbedUrl(block);
        if (embed) return { type: "embed", platform: embed.platform, embedUrl: embed.embedUrl };
      }

      return { type: "paragraph", text: block };
    });
}
