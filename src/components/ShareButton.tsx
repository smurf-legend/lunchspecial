"use client";
import { useEffect, useRef, useState } from "react";

export default function ShareButton({ url, title }: { url: string; title: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // user cancelled the native share sheet — nothing to do
      }
      return;
    }
    setMenuOpen((o) => !o);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={handleShare}
        className="text-gray-700 text-xs font-medium border rounded-full px-3 py-1.5 hover:bg-gray-50 flex items-center gap-1.5"
      >
        <span aria-hidden="true">🔗</span> Share
      </button>

      {menuOpen && (
        <div className="absolute right-0 mt-1 w-48 bg-white border rounded-lg shadow-lg z-20 py-1 text-sm">
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-3 py-2 hover:bg-gray-50"
            onClick={() => setMenuOpen(false)}
          >
            Facebook
          </a>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-3 py-2 hover:bg-gray-50"
            onClick={() => setMenuOpen(false)}
          >
            X (Twitter)
          </a>
          <a
            href={`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-3 py-2 hover:bg-gray-50"
            onClick={() => setMenuOpen(false)}
          >
            WhatsApp
          </a>
          <button
            type="button"
            onClick={copyLink}
            className="block w-full text-left px-3 py-2 hover:bg-gray-50"
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>
      )}
    </div>
  );
}
