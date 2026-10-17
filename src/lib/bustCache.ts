import { revalidateTag } from "next/cache";

// Call after any write that changes what listing/detail pages show, so the
// 24-hour cache in cachedQueries.ts doesn't make edits look like they failed.
export const bustSpecialsCache = () => revalidateTag("specials");
export const bustCategoriesCache = () => revalidateTag("categories");
export const bustBlogCache = () => revalidateTag("blog");
