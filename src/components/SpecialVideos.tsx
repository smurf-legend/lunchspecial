import SocialEmbed from "@/components/SocialEmbed";

// Video/review links showing the actual food — a text description only
// goes so far toward "is this actually worth it." Multiple embeds are
// expected, not one: a long YouTube review, a TikTok clip, and an
// Instagram Reel are all reasonable to show side by side for the same special.
export default function SpecialVideos({ urls }: { urls: string[] }) {
  if (urls.length === 0) return null;

  return (
    <div className="bg-white rounded-lg border p-6">
      <h2 className="font-bold text-lg mb-4">Videos & Reviews</h2>
      <div className="flex flex-col gap-4">
        {urls.map((url) => (
          <SocialEmbed key={url} url={url} />
        ))}
      </div>
    </div>
  );
}
