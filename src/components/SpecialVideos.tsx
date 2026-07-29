import SocialEmbed from "@/components/SocialEmbed";
import { getEmbedThumbnail } from "@/lib/embedThumbnail";

// Video/review links showing the actual food — a text description only
// goes so far toward "is this actually worth it." Multiple embeds are
// expected, not one: a long YouTube review, a TikTok clip, and an
// Instagram Reel are all reasonable to show side by side for the same
// special. Thumbnails are fetched here (server-side, in parallel) rather
// than by SocialEmbed itself, since that's a client component and this
// avoids a client-side waterfall of third-party requests before anything
// is visible — see getEmbedThumbnail for why not every platform gets one.
export default async function SpecialVideos({ urls }: { urls: string[] }) {
  if (urls.length === 0) return null;

  const thumbnails = await Promise.all(urls.map((url) => getEmbedThumbnail(url)));

  return (
    <div className="bg-white rounded-lg border p-6">
      <h2 className="font-bold text-lg mb-4">Videos & Reviews</h2>
      {/* auto-fit + minmax rather than a fixed column count: multiple videos
          sit side by side once there's room for more than one 300px-wide
          track, a single video still gets the full row (empty tracks
          collapse instead of leaving it stuck in a half-width column), and
          it drops to one column on narrow/mobile viewports on its own. */}
      <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
        {urls.map((url, i) => (
          <SocialEmbed key={url} url={url} thumbnailUrl={thumbnails[i]} />
        ))}
      </div>
    </div>
  );
}
