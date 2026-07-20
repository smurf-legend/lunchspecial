import Link from "next/link";
import { isExpired, formatExpiry } from "@/lib/dealStatus";
import { googleMapsUrl } from "@/lib/mapsLink";
import SpecialImage from "@/components/SpecialImage";
import FavoriteButton from "@/components/FavoriteButton";
import ShareButton from "@/components/ShareButton";
import { specialSlug } from "@/lib/slugify";
import { SITE_URL } from "@/lib/site";

type SpecialCardType = {
  id: string;
  title: string;
  description: string;
  venueName: string;
  address?: string | null;
  specialPrice: number | null;
  discountPercent?: number | null;
  usualPrice?: number | null;
  availableDays: string;
  score: number;
  upvoteCount?: number;
  downvoteCount?: number;
  imageUrl?: string | null;
  expiresAt?: string | Date | null;
  suburbs: { suburb: { name: string; slug: string } }[];
  chainWide?: boolean;
  greatValue?: boolean;
  couponCode?: string | null;
  _count?: { comments: number };
  categories?: { category: { name: string; slug: string } }[];
};

export default function SpecialCard({
  special,
  contextSuburbSlug,
  isFavorited = false,
}: {
  special: SpecialCardType;
  // Which suburb this card is being shown "for" — e.g. the suburb page or
  // matched location search. A chain deal belongs to many suburbs, so
  // without this we wouldn't know which one is relevant to the current view.
  // Falls back to the first suburb when not viewing within one suburb's context.
  contextSuburbSlug?: string;
  isFavorited?: boolean;
}) {
  const discount =
    special.usualPrice && special.specialPrice != null && special.usualPrice > special.specialPrice
      ? Math.round(100 - (special.specialPrice / special.usualPrice) * 100)
      : null;
  const expired = isExpired(special.expiresAt ?? null);
  const suburbList = special.suburbs.map((s) => s.suburb);
  const displaySuburb = suburbList.find((s) => s.slug === contextSuburbSlug) ?? suburbList[0];
  const chainWide = special.chainWide ?? false;

  return (
    <div
      className={`flex gap-4 bg-white rounded-lg border p-4 hover:shadow-md transition-shadow ${
        expired ? "border-gray-200 opacity-60" : "border-gray-200"
      }`}
    >
      <div className="flex flex-col items-center w-14 shrink-0 gap-1">
        <span className="flex items-center gap-1">
          <span aria-hidden="true">😋</span>
          <span className="font-bold text-green-600">{special.upvoteCount ?? 0}</span>
        </span>
        <span className="flex items-center gap-1">
          <span aria-hidden="true">🤢</span>
          <span className="font-bold text-red-600">{special.downvoteCount ?? 0}</span>
        </span>
      </div>

      <Link href={`/specials/${specialSlug(special)}`} prefetch={false} className="shrink-0">
        <SpecialImage
          src={special.imageUrl}
          alt={special.title}
          className="w-20 h-20 object-cover rounded shrink-0"
          iconClassName="text-2xl"
        />
      </Link>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/specials/${specialSlug(special)}`}
            prefetch={false}
            className="font-semibold text-lg hover:text-orange-600"
          >
            {special.title}
          </Link>
          {special.greatValue && (
            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium shrink-0">
              💎 Everyday Value
            </span>
          )}
          {expired ? (
            <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded text-xs font-medium shrink-0">
              Expired {formatExpiry(special.expiresAt!)}
            </span>
          ) : (
            special.expiresAt && (
              <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs font-medium shrink-0">
                Ends {formatExpiry(special.expiresAt)}
              </span>
            )
          )}
        </div>

        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {special.specialPrice != null ? (
            <span className="font-bold text-green-700 text-xl">
              ${special.specialPrice.toFixed(2)}
            </span>
          ) : (
            special.discountPercent != null && (
              <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-lg text-base font-bold">
                {special.discountPercent}% off
              </span>
            )
          )}
          {special.usualPrice != null && (
            <span className="line-through text-gray-400">${special.usualPrice.toFixed(2)}</span>
          )}
          {discount != null && (
            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium">
              {discount}% off
            </span>
          )}
        </div>

        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{special.description}</p>

        <div className="flex items-center gap-3 mt-2 text-sm flex-wrap">
          <span className="text-gray-700 font-medium">{special.venueName}</span>
          {chainWide ? (
            <span className="text-gray-500">📍 All Sydney locations</span>
          ) : suburbList.length > 1 ? (
            // Multiple specific branches but only one address/map link was
            // captured — showing that single pin next to one suburb name
            // implied it was the only (or "the" representative) location,
            // which was misleading. Generic label instead, same idea as
            // chainWide's, until/unless we support one address per suburb.
            <span className="text-gray-500">📍 Multiple locations ({suburbList.length})</span>
          ) : (
            <>
              <a
                href={googleMapsUrl(special.venueName, special.address, displaySuburb.name)}
                target="_blank"
                rel="noopener noreferrer"
                title={`Open ${special.venueName} in Google Maps`}
                className="text-gray-500 hover:text-orange-600"
              >
                📍
              </a>
              <Link
                href={`/suburbs/${displaySuburb.slug}`}
                prefetch={false}
                className="text-gray-500 hover:text-orange-600"
              >
                {displaySuburb.name}
              </Link>
            </>
          )}
          {special.couponCode && (
            <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-mono font-medium">
              Code: {special.couponCode}
            </span>
          )}
          <span className="text-gray-400">💬 {special._count?.comments ?? 0}</span>
        </div>

        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className="text-xs text-gray-500">{special.availableDays}</span>
          {special.categories?.map((c) => (
            <Link
              key={c.category.slug}
              href={`/?category=${c.category.slug}`}
              className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600 hover:bg-gray-200"
            >
              {c.category.name}
            </Link>
          ))}
          <FavoriteButton specialId={special.id} initialFavorited={isFavorited} />
          <ShareButton
            url={`${SITE_URL}/specials/${specialSlug(special)}`}
            title={`${special.title} — ${special.venueName}`}
          />
        </div>
      </div>
    </div>
  );
}
