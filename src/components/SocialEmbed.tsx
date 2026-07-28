import { socialEmbedUrl, embedContainerClass } from "@/lib/articleBlocks";

// Renders one embedded YouTube/Vimeo/Instagram/X/TikTok/Facebook post as an
// iframe, sized per-platform. Used both by ArticleBody (Table Talk embed
// blocks) and SpecialVideos (a Special's video/review links) so the two
// never size embeds differently. Renders nothing for a URL that isn't a
// recognized platform link — callers don't need to pre-filter.
export default function SocialEmbed({ url }: { url: string }) {
  const embed = socialEmbedUrl(url);
  if (!embed) return null;

  return (
    <div className={embedContainerClass(embed.platform)}>
      <iframe
        src={embed.embedUrl}
        className="w-full h-full rounded-lg border"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
