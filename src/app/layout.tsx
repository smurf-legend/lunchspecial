import "./globals.css";
import Link from "next/link";
import Providers from "./providers";
import NavAuth from "@/components/NavAuth";
import { GoogleAnalytics } from "@next/third-parties/google";

const title = "LunchSpecial — Lunch specials near you, crowdsourced";
const description = "Find and share the best lunch specials near you, posted by the community.";

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">
        <Providers>
          {/* transform-gpu forces the sticky header onto its own GPU-composited
              layer — without it, some WebKit-based in-app browsers (e.g. the
              WhatsApp/Instagram in-app browser) fail to repaint it correctly
              after scrolling to the bottom and back up, leaving a stuck gray
              rectangle until the page is reloaded. */}
          <header className="bg-orange-600 text-white sticky top-0 z-10 shadow transform-gpu">
            <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
              <Link href="/" className="text-xl font-bold">LunchSpecial</Link>
              <nav className="flex flex-wrap gap-x-3 gap-y-1.5 text-sm font-medium items-center">
                <Link href="/">Specials</Link>
                <Link href="/table-talk">Table Talk</Link>
                <Link href="/post">Add a Special</Link>
                <NavAuth />
              </nav>
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
