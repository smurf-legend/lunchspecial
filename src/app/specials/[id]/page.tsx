import { cache } from "react";
import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import VoteButtons from "@/components/VoteButtons";
import FavoriteButton from "@/components/FavoriteButton";
import CommentThread from "@/components/CommentThread";
import Link from "next/link";
import { isExpired, formatExpiry } from "@/lib/dealStatus";
import { googleMapsUrl, isMapsLink } from "@/lib/mapsLink";
import ContributorBadge from "@/components/ContributorBadge";
import DeleteSpecialButton from "@/components/DeleteSpecialButton";
import DuplicateSpecialButton from "@/components/DuplicateSpecialButton";
import SpecialGallery from "@/components/SpecialGallery";
import ShareButton from "@/components/ShareButton";
import { buildCommentTree } from "@/lib/commentTree";
import { idFromSlug, specialSlug } from "@/lib/slugify";
import { SITE_URL } from "@/lib/site";
import { buildOfferJsonLd, buildBreadcrumbJsonLd, safeJsonLd } from "@/lib/structuredData";

const authorSelect = {
  select: {
    name: true,
    _count: { select: { specials: true, comments: true } },
  },
};

// Shared between generateMetadata and the page body so the two don't issue
// duplicate queries for the same special within one request.
const getSpecial = cache((id: string) =>
  prisma.special.findUnique({
    where: { id },
    include: {
      author: authorSelect,
      suburbs: { include: { suburb: true } },
      categories: { include: { category: true } },
    },
  })
);

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const special = await getSpecial(idFromSlug(params.id));
  if (!special || special.hidden) return {};

  const suburbNames = special.suburbs.map((s) => s.suburb.name).join(", ");
  const title = `${special.title} — ${special.venueName}${suburbNames ? ` (${suburbNames})` : ""} | LunchSpecial`;
  const description = special.description.slice(0, 155);
  const canonical = `/specials/${specialSlug(special)}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "LunchSpecial",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function SpecialDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const isAdmin = (session?.user as any)?.role === "admin";
  const id = idFromSlug(params.id);

  const userId = (session?.user as any)?.id as string | undefined;

  const [special, flatComments, favorite] = await Promise.all([
    getSpecial(id),
    // Fetched flat (not nested) since replies can nest to any depth — the
    // tree is assembled in commentTree.ts instead of a fixed-depth include.
    prisma.comment.findMany({
      where: { specialId: id },
      include: { author: authorSelect },
      orderBy: { createdAt: "asc" },
    }),
    userId ? prisma.favorite.findUnique({ where: { userId_specialId: { userId, specialId: id } } }) : null,
  ]);

  if (!special) notFound();
  const isAuthor = userId != null && special.authorId === userId;
  // Hidden specials 404 for everyone except admins and the post's own
  // author, who see a banner below instead — the row still exists so it
  // can be reviewed/unhidden (or fixed up and resubmitted) later.
  if (special.hidden && !isAdmin && !isAuthor) notFound();

  // Send old bare-id links and stale slugs (e.g. after a title edit) to the
  // current canonical URL, so there's only ever one indexable address per special.
  const canonical = specialSlug(special);
  if (params.id !== canonical) redirect(`/specials/${canonical}`);

  const commentTree = buildCommentTree(flatComments);

  const discount =
    special.usualPrice && special.specialPrice != null && special.usualPrice > special.specialPrice
      ? Math.round(100 - (special.specialPrice / special.usualPrice) * 100)
      : null;
  const expired = isExpired(special.expiresAt);
  const suburbList = special.suburbs.map((s) => s.suburb);
  const primarySuburb = suburbList[0];
  const chainWide = special.chainWide;

  const offerJsonLd = buildOfferJsonLd({
    url: `${SITE_URL}/specials/${canonical}`,
    title: special.title,
    description: special.description,
    venueName: special.venueName,
    imageUrl: special.imageUrl,
    specialPrice: special.specialPrice,
    discountPercent: special.discountPercent,
    priceRangeMin: special.priceRangeMin,
    priceRangeMax: special.priceRangeMax,
    expiresAt: special.expiresAt,
    expired,
    locationName: chainWide ? "All locations" : primarySuburb?.name,
  });

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    ...(primarySuburb
      ? [{ name: primarySuburb.name, url: `${SITE_URL}/suburbs/${primarySuburb.slug}` }]
      : []),
    { name: special.title, url: `${SITE_URL}/specials/${canonical}` },
  ]);

  return (
    <div className="flex flex-col gap-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(offerJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }} />

      {special.hidden && isAdmin && (
        <div className="bg-gray-800 text-white rounded-lg px-4 py-3 text-sm font-medium">
          This special is hidden — only admins can see it.{" "}
          <Link href={`/kitchen/specials/${special.id}/edit`} className="underline">
            Manage
          </Link>
        </div>
      )}

      {special.hidden && !isAdmin && isAuthor && (
        <div className="bg-gray-800 text-white rounded-lg px-4 py-3 text-sm font-medium">
          This special is hidden by moderation — only you can see it. You can still edit it below.
        </div>
      )}

      {expired && (
        <div className="bg-gray-100 border border-gray-300 text-gray-700 rounded-lg px-4 py-3 text-sm font-medium">
          This deal expired on {formatExpiry(special.expiresAt!)} — it may no longer be available.
        </div>
      )}

      <div className={`bg-white rounded-lg border p-6 flex gap-5 ${expired ? "opacity-70" : ""}`}>
        <VoteButtons voteEndpoint={`/api/specials/${special.id}/vote`} initialScore={special.score} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{special.title}</h1>
            {special.greatValue && (
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">
                💎 Everyday Value
              </span>
            )}
            {expired ? (
              <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded text-xs font-medium">
                Expired
              </span>
            ) : (
              special.expiresAt && (
                <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs font-medium">
                  Ends {formatExpiry(special.expiresAt)}
                </span>
              )
            )}
            <FavoriteButton specialId={special.id} initialFavorited={!!favorite} />
            <ShareButton url={`${SITE_URL}/specials/${canonical}`} title={`${special.title} — ${special.venueName}`} />
            {isAdmin && (
              <>
                <Link
                  href={`/kitchen/specials/${special.id}/edit`}
                  className="text-xs px-2 py-1 rounded-full font-medium border shrink-0 bg-gray-800 text-white border-gray-800"
                >
                  ✏️ Edit
                </Link>
                <DuplicateSpecialButton specialId={special.id} />
                <DeleteSpecialButton specialId={special.id} title={special.title} />
              </>
            )}
            {isAuthor && !isAdmin && (
              <>
                <Link
                  href={`/specials/${special.id}/edit`}
                  className="text-xs px-2 py-1 rounded-full font-medium border shrink-0 bg-gray-800 text-white border-gray-800"
                >
                  ✏️ Edit
                </Link>
                <DeleteSpecialButton specialId={special.id} title={special.title} apiBase="/api/specials" />
              </>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {special.specialPrice != null ? (
              <span className="font-bold text-green-700 text-3xl">
                ${special.specialPrice.toFixed(2)}
              </span>
            ) : special.discountPercent != null ? (
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-lg text-2xl font-bold">
                {special.discountPercent}% off
              </span>
            ) : (
              special.priceRangeMin != null &&
              special.priceRangeMax != null && (
                <span className="font-bold text-green-700 text-3xl">
                  ${special.priceRangeMin.toFixed(2)}–${special.priceRangeMax.toFixed(2)}
                </span>
              )
            )}
            {special.usualPrice != null && (
              <span className="line-through text-gray-400 text-lg">
                ${special.usualPrice.toFixed(2)}
              </span>
            )}
            {discount != null && (
              <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium">
                {discount}% off
              </span>
            )}
          </div>

          <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5 flex-wrap">
            Posted by {special.author.name}
            <ContributorBadge
              specials={special.author._count.specials}
              comments={special.author._count.comments}
            />
            <span>· {new Date(special.createdAt).toLocaleDateString()}</span>
          </p>

          <SpecialGallery
            images={[special.imageUrl, ...special.extraImageUrls].filter((u): u is string => !!u)}
            alt={special.title}
          />

          <p className="mt-4 text-gray-800 whitespace-pre-line">{special.description}</p>

          <div className="flex items-center gap-3 mt-4 text-sm flex-wrap">
            <span className="font-medium">{special.venueName}</span>
            {chainWide ? (
              <span className="text-gray-600">📍 All Stores</span>
            ) : suburbList.length > 1 ? (
              // Multiple branches but only one address/map link was captured
              // — a single pin next to one suburb name implied it was the
              // only (or "the") location, which was misleading. The full
              // suburb list is already shown below, so just flag there's
              // more than one here rather than repeating it.
              <span className="text-gray-600">📍 Multiple locations ({suburbList.length})</span>
            ) : (
              <>
                <a
                  href={googleMapsUrl(special.venueName, special.address, primarySuburb.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Open ${special.venueName} in Google Maps`}
                  className="text-gray-600 hover:text-orange-600"
                >
                  📍
                </a>
                <Link
                  href={`/?suburb=${primarySuburb.slug}`}
                  className="text-gray-600 hover:text-orange-600"
                >
                  {primarySuburb.name}
                </Link>
              </>
            )}
            {suburbList.length <= 1 && special.address && !isMapsLink(special.address) && (
              <span className="text-gray-500">{special.address}</span>
            )}
          </div>

          {chainWide && (
            <p className="text-sm text-gray-500 mt-2">
              Available at most {special.venueName} locations across Sydney — participation may vary by store.
            </p>
          )}

          {!chainWide && suburbList.length > 1 && (
            <p className="text-sm text-gray-500 mt-2">
              Available in {suburbList.length} suburbs:{" "}
              {suburbList.slice(0, 12).map((s, i) => (
                <span key={s.slug}>
                  <Link href={`/suburbs/${s.slug}`} className="text-gray-600 hover:text-orange-600 underline">
                    {s.name}
                  </Link>
                  {i < Math.min(suburbList.length, 12) - 1 ? ", " : ""}
                </span>
              ))}
              {suburbList.length > 12 && (
                <span className="text-gray-400"> and {suburbList.length - 12} more</span>
              )}
            </p>
          )}

          {special.couponCode && (
            <p className="text-sm mt-2">
              Code:{" "}
              <span className="bg-gray-100 px-2 py-0.5 rounded font-mono font-medium text-gray-800">
                {special.couponCode}
              </span>
            </p>
          )}

          <p className="text-sm text-gray-500 mt-2">
            Available {special.availableDays}
            {special.startTime && special.endTime && ` · ${special.startTime}–${special.endTime}`}
          </p>

          <div className="flex gap-2 mt-3 flex-wrap">
            {special.categories.map((c) => (
              <Link
                key={c.category.slug}
                href={`/?category=${c.category.slug}`}
                className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600 hover:bg-gray-200"
              >
                {c.category.name}
              </Link>
            ))}
          </div>

          {special.url && (
            <a
              href={special.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-block mt-5 bg-orange-600 text-white px-5 py-2 rounded font-medium"
            >
              View menu / link →
            </a>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border p-6">
        <CommentThread
          commentsEndpoint={`/api/specials/${special.id}/comments`}
          reactEndpointBase="/api/comments"
          comments={commentTree as any}
        />
      </div>
    </div>
  );
}
