import "./globals.css";
import Link from "next/link";
import Providers from "./providers";
import NavAuth from "@/components/NavAuth";

export const metadata = {
  title: "LunchSpecial — Sydney lunch specials, crowdsourced",
  description: "Find and share the best lunch specials near you, posted by the community.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">
        <Providers>
          <header className="bg-orange-600 text-white sticky top-0 z-10 shadow">
            <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
              <Link href="/" className="text-xl font-bold">LunchSpecial</Link>
              <nav className="flex gap-4 text-sm font-medium items-center">
                <Link href="/table-talk">Table Talk</Link>
                <Link href="/specials/new">Post a Special</Link>
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
    </html>
  );
}
