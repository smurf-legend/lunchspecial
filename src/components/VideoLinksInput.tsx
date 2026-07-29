"use client";
import { useState } from "react";
import { socialEmbedUrl, PLATFORM_LABELS, MAX_SPECIAL_VIDEOS } from "@/lib/articleBlocks";

// Repeatable list of video/review links for a Special — YouTube, TikTok,
// Instagram, X, Facebook, or Vimeo. Deliberately a list rather than one
// optional field: a long-form YouTube review and a quick TikTok clip are
// both reasonable to attach to the same special. Capped at
// MAX_SPECIAL_VIDEOS (2) rather than unlimited — confirmed in production
// that a 3rd embed on one page is unreliable (TikTok specifically fails to
// play), even with each iframe deferred until clicked. Shared between the
// post form and the edit form so they never validate/render this differently.
export default function VideoLinksInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
}) {
  const [input, setInput] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const atLimit = value.length >= MAX_SPECIAL_VIDEOS;

  function addLink() {
    const url = input.trim();
    if (!url) return;
    if (atLimit) {
      setInputError(`Up to ${MAX_SPECIAL_VIDEOS} videos — remove one first to add another`);
      return;
    }
    const embed = socialEmbedUrl(url);
    if (!embed) {
      setInputError("Not a recognized YouTube, TikTok, Instagram, X, Facebook, or Vimeo link");
      return;
    }
    if (value.includes(url)) {
      setInputError("That link's already added");
      return;
    }
    onChange([...value, url]);
    setInput("");
    setInputError(null);
  }

  function removeLink(url: string) {
    onChange(value.filter((u) => u !== url));
  }

  return (
    <div>
      <p className="text-sm font-medium mb-1">Videos & reviews (optional)</p>
      <p className="text-xs text-gray-400 mb-2">
        Paste links from YouTube, TikTok, Instagram, X, Facebook, or Vimeo — a long review, a
        short clip, a reel, whatever actually shows the food. Up to {MAX_SPECIAL_VIDEOS}.
      </p>
      {value.length > 0 && (
        <ul className="flex flex-col gap-1.5 mb-2">
          {value.map((url) => {
            const embed = socialEmbedUrl(url);
            return (
              <li
                key={url}
                className="flex items-center gap-2 text-sm bg-gray-50 border rounded px-2.5 py-1.5"
              >
                <span className="text-xs font-medium bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded shrink-0">
                  {embed ? PLATFORM_LABELS[embed.platform] : "?"}
                </span>
                <span className="truncate flex-1 text-gray-600">{url}</span>
                <button
                  type="button"
                  onClick={() => removeLink(url)}
                  className="text-gray-400 hover:text-gray-900 font-bold px-1 shrink-0"
                  aria-label="Remove link"
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {atLimit ? (
        <p className="text-xs text-gray-500">
          {MAX_SPECIAL_VIDEOS} added — remove one above to add a different link.
        </p>
      ) : (
        <div className="flex gap-2">
          <input
            type="url"
            placeholder="Paste a YouTube, TikTok, Instagram, X, or Facebook link"
            className="border rounded px-3 py-2 text-sm w-full"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setInputError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addLink();
              }
            }}
          />
          <button
            type="button"
            onClick={addLink}
            disabled={!input.trim()}
            className="text-sm border px-3 py-1 rounded font-medium disabled:opacity-50 shrink-0"
          >
            Add
          </button>
        </div>
      )}
      {inputError && <p className="text-red-600 text-xs mt-1">{inputError}</p>}
    </div>
  );
}
