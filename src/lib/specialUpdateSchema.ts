import { z } from "zod";
import { noProfanity, profanityMessage } from "@/lib/profanity";

// Shared between the admin edit route and the owner-facing edit route so
// the two can never validate updates differently.
export const specialUpdateSchema = z
  .object({
    title: z.string().min(5).max(200).refine(noProfanity, profanityMessage("Title")),
    description: z.string().min(10).refine(noProfanity, profanityMessage("Description")),
    venueName: z.string().min(1),
    address: z.string().optional().nullable(),
    url: z.string().url().optional().nullable().or(z.literal("")),
    imageUrl: z.string().url().optional().nullable().or(z.literal("")),
    extraImageUrls: z.array(z.string().url()).optional(),
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
