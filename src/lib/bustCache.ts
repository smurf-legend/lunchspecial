import { revalidatePath, revalidateTag } from "next/cache";

// Call after any write that changes what listing/detail pages show, so the
// 7-day cache in cachedQueries.ts doesn't make edits look like they failed.
// The sitemap lists every special, so it is cleared alongside the data tags;
// its own long lifetime (see sitemap.xml/route.ts) then only matters for
// changes that bypass the app.
export const bustSpecialsCache = () => {
  revalidateTag("specials");
  revalidatePath("/sitemap.xml");
};
export const bustCategoriesCache = () => revalidateTag("categories");
export const bustBlogCache = () => {
  revalidateTag("blog");
  revalidatePath("/sitemap.xml");
};
