import { parseArticleBlocks, SocialPlatform } from "@/lib/articleBlocks";

// YouTube/Vimeo are always 16:9. TikTok embeds are tall (vertical video),
// so a 16:9 box would crush them — cap their width instead of the aspect.
// Instagram/Twitter/Facebook posts vary in height post-to-post (a photo vs.
// a long tweet thread). A bare iframe src (no widgets.js/embed.js) never
// gets the postMessage telling the parent to resize to fit content, so it
// needs an explicit, generously tall fixed height — a *min*-height doesn't
// work here, since percentage heights (the iframe's h-full) don't resolve
// against a parent whose height is only a minimum, and the iframe silently
// collapses instead of growing to fill it.
function embedContainerClass(platform: SocialPlatform): string {
  switch (platform) {
    case "youtube":
    case "vimeo":
      return "aspect-video w-full";
    case "tiktok":
      return "aspect-[9/16] w-full max-w-sm mx-auto";
    case "instagram":
    case "twitter":
    case "facebook":
      return "w-full h-[720px] max-w-lg mx-auto";
  }
}

export default function ArticleBody({ body }: { body: string }) {
  const blocks = parseArticleBlocks(body);

  return (
    <div className="flex flex-col gap-4">
      {blocks.map((block, i) => {
        if (block.type === "image") {
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={block.src} alt={block.alt} className="w-full rounded-lg border" />
          );
        }
        if (block.type === "embed") {
          return (
            <div key={i} className={embedContainerClass(block.platform)}>
              <iframe
                src={block.embedUrl}
                className="w-full h-full rounded-lg border"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          );
        }
        return (
          <p key={i} className="text-gray-800">
            {block.text}
          </p>
        );
      })}
    </div>
  );
}
