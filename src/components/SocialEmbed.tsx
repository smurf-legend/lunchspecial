"use client";
import { useState } from "react";
import { socialEmbedUrl, embedContainerClass, PLATFORM_LABELS } from "@/lib/articleBlocks";

// Click-to-load rather than an immediately-live iframe. Each of these embeds
// is genuinely heavy (TikTok's embed page alone is 300KB+ of HTML plus its
// own JS bundle and video player) — loading several simultaneously on one
// Special's page causes real resource contention, and TikTok's player in
// particular doesn't handle that reliably (confirmed: with 3 TikTok embeds
// on one page, the third would neither autoplay nor start on click). Only
// initializing the player the visitor actually asked for avoids that
// entirely, and as a bonus stops loading ~1MB of iframe content for anyone
// who never presses play.
export default function SocialEmbed({ url, thumbnailUrl }: { url: string; thumbnailUrl?: string | null }) {
  const [loaded, setLoaded] = useState(false);
  const embed = socialEmbedUrl(url);
  if (!embed) return null;

  const containerClass = embedContainerClass(embed.platform);

  if (loaded) {
    return (
      <div className={containerClass}>
        <iframe
          src={embed.embedUrl}
          className="w-full h-full rounded-lg border"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setLoaded(true)}
      className={`${containerClass} relative rounded-lg border overflow-hidden bg-gray-900 group block`}
      aria-label={`Play ${PLATFORM_LABELS[embed.platform]} video`}
    >
      {thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnailUrl}
          alt=""
          className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white text-sm font-medium">
          {PLATFORM_LABELS[embed.platform]}
        </div>
      )}
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform">
          ▶️
        </span>
      </span>
      <span className="absolute bottom-2 left-2 text-xs font-medium bg-black/60 text-white px-2 py-0.5 rounded">
        {PLATFORM_LABELS[embed.platform]}
      </span>
    </button>
  );
}
