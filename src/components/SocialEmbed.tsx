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

  // Instagram's own embed page for both Reels and feed posts is a
  // click-through preview, not a real inline player — its "Watch on
  // Instagram" button (and the fallback for anyone not logged in) uses a
  // top-level navigation that breaks out of our iframe entirely, replacing
  // the whole lunchspecial.com.au tab with instagram.com. There's no bare
  // embed URL that avoids this — Meta doesn't offer inline autoplay to
  // unauthenticated third-party embeds. Rather than promise playback we
  // can't deliver, the whole card links out honestly in a new tab — but we
  // still show Instagram's own preview frame as the background, loaded in
  // a sandboxed iframe with no allow-top-navigation/allow-popups, so the
  // browser itself blocks the frame from hijacking navigation no matter
  // what its embedded JS tries to do. pointer-events-none makes it purely
  // decorative — every click lands on the <a> wrapping it. Loaded eagerly
  // rather than click-to-load like the other platforms below: Instagram
  // embeds only ever appear here, capped at MAX_SPECIAL_VIDEOS (2) per
  // special, so it doesn't carry the same many-iframes-on-one-page cost
  // that motivated click-to-load for TikTok.
  if (embed.platform === "instagram") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`${containerClass} relative rounded-lg border overflow-hidden bg-gray-900 group block`}
      >
        <iframe
          src={embed.embedUrl}
          className="absolute inset-0 w-full h-full pointer-events-none"
          sandbox="allow-scripts allow-same-origin"
          tabIndex={-1}
          aria-hidden="true"
        />
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
          <span className="px-4 py-2 rounded-full bg-white/90 text-sm font-medium shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
            View on Instagram ↗
          </span>
        </span>
        <span className="absolute bottom-2 left-2 text-xs font-medium bg-black/60 text-white px-2 py-0.5 rounded pointer-events-none">
          {PLATFORM_LABELS.instagram}
        </span>
      </a>
    );
  }

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
