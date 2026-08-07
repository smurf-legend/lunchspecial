import "./globals.css";
import { Suspense } from "react";
import Link from "next/link";
import Providers from "./providers";
import NavAuth from "@/components/NavAuth";
import LocationSearch from "@/components/LocationSearch";
import { GoogleAnalytics } from "@next/third-parties/google";
import { prisma } from "@/lib/prisma";

const title = "LunchSpecial — Lunch specials near you, crowdsourced";
// Sydney-specific rather than generic "near you" — accurate now that
// coverage is deliberately NSW-only (see liveStates.ts), and a more
// specific description is also more likely to actually get used in search
// results instead of Google substituting its own extracted snippet.
const description = "Find and share the best lunch specials in Sydney, posted by the community.";

export const metadata = {
  metadataBase: new URL("https://lunchspecial.com.au"),
  title,
  description,
  openGraph: { title, description, siteName: "LunchSpecial", type: "website" },
  twitter: { card: "summary_large_image", title, description },
  verification: {
    google: "3H9GppUjzAo1EO_QjQho5Php3072xTz5B-EaeZkkbz8",
    other: { "msvalidate.01": "70B4AE1710D721677B39FA3944956C82" },
  },
};

// Matches the brand red (#CD1C18) — the color mobile browser chrome/tab
// bars pick up around the page.
export const viewport = {
  themeColor: "#CD1C18",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Fetched here (not just on the homepage) so the cuisine dropdown can live
  // in the header search bar, which every page renders via this layout —
  // the dropdown itself only actually shows on "/" (see LocationSearch),
  // but the data has to be available wherever the client component mounts.
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">
        <Providers>
          {/* Sticky only from sm up — now that the header also carries the
              search bar (two rows, not one), staying pinned on mobile ate a
              disproportionate chunk of the viewport while scrolling a
              special's details. Desktop has room to spare, so it stays
              pinned there. transform-gpu forces the sticky header onto its
              own GPU-composited layer — without it, some WebKit-based
              in-app browsers (e.g. the WhatsApp/Instagram in-app browser)
              fail to repaint it correctly after scrolling to the bottom and
              back up, leaving a stuck gray rectangle until the page is
              reloaded. */}
          <header className="bg-orange-600 text-white sm:sticky sm:top-0 z-10 shadow transform-gpu">
            <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
              <Link href="/" className="text-xl font-bold">LunchSpecial</Link>
              <nav className="flex flex-wrap gap-x-3 gap-y-1.5 text-sm font-medium items-center">
                <Link href="/">Specials</Link>
                <Link href="/table-talk">Table Talk</Link>
                <Link href="/post">Add a Special</Link>
                <NavAuth />
              </nav>
            </div>
            {/* Suspense boundary because LocationSearch reads useSearchParams()
                client-side — without it, every page using this layout (not
                just the homepage, which was already dynamic from reading
                searchParams server-side) would be forced out of static
                rendering just to show the search bar. */}
            <div className="max-w-5xl mx-auto px-4 pb-3">
              <Suspense fallback={<div className="h-[42px]" />}>
                <LocationSearch categories={categories} />
              </Suspense>
            </div>
          </header>
          <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
          <footer className="max-w-5xl mx-auto px-4 py-6 text-sm text-gray-400 flex gap-4">
            <span>© {new Date().getFullYear()} LunchSpecial</span>
            <Link href="/privacy" className="hover:text-gray-600">
              Privacy Policy
            </Link>
          </footer>
        </Providers>
      </body>
      {process.env.NEXT_PUBLIC_GA_ID && <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />}
    </html>
  );
}
