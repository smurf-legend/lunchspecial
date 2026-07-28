import { z } from "zod";
import { noProfanity, profanityMessage } from "@/lib/profanity";
import { socialEmbedUrl } from "@/lib/articleBlocks";

// Shared between the admin edit route and the owner-facing edit route so
// the two can never validate updates differently.
export const specialUpdateSchema = z
  .object({
    title: z.string().min(5).max(60).refine(noProfanity, profanityMessage("Title")),
    description: z.string().min(10).refine(noProfanity, profanityMessage("Description")),
    venueName: z.string().min(1),
    address: z.string().optional().nullable(),
    url: z.string().url().optional().nullable().or(z.literal("")),
    imageUrl: z.string().url().optional().nullable().or(z.literal("")),
    extraImageUrls: z.array(z.string().url()).optional(),
    // Each must actually resolve to a supported embed (YouTube/TikTok/
    // Instagram/X/Facebook/Vimeo) — a URL that can't be embedded would just
    // render nothing on the detail page, so reject it here rather than
    // silently store a dead link.
    videoUrls: z.array(z.string().url().refine((u) => socialEmbedUrl(u) !== null, {
      message: "Must be a YouTube, TikTok, Instagram, X, Facebook, or Vimeo link",
    })).optional(),
    couponCode: z.string().optional().nullable(),
    usualPrice: z.number().optional().nullable(),
    specialPrice: z.number().optional().nullable(),
    discountPercent: z.number().int().min(1).max(100).optional().nullable(),
    priceRangeMin: z.number().optional().nullable(),
    priceRangeMax: z.number().optional().nullable(),
    availableDays: z.string().optional(),
    startTime: z.string().optional().nullable(),
    endTime: z.string().optional().nullable(),
    expiresAt: z
      .string()
      .optional()
      .nullable()
      .transform((val) => (val ? new Date(val) : null)),
    suburbSlugs: z.array(z.string()),
    chainWide: z.boolean().optional().default(false),
    greatValue: z.boolean().optional().default(false),
    membersOnly: z.boolean().optional().default(false),
    deliveryAvailable: z.boolean().optional().default(false),
    categorySlugs: z.array(z.string()).optional(),
  })
  .refine((data) => data.chainWide || data.suburbSlugs.length > 0, {
    message: "Select at least one suburb, or mark this as a nationwide chain",
    path: ["suburbSlugs"],
  })
  .refine(
    (data) => data.specialPrice != null || data.discountPercent != null || (data.priceRangeMin != null && data.priceRangeMax != null),
    {
      message: "Enter a special price, a percentage discount, or a price range",
      path: ["specialPrice"],
    }
  )
  .refine((data) => data.priceRangeMin == null || data.priceRangeMax == null || data.priceRangeMax > data.priceRangeMin, {
    message: "The high end of the price range must be more than the low end",
    path: ["priceRangeMax"],
  });
