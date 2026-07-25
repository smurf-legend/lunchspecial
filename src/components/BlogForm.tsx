"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { compressImage } from "@/lib/compressImage";
import { socialEmbedUrl } from "@/lib/articleBlocks";
import { isScheduled, formatScheduled } from "@/lib/postStatus";
import ArticleBody from "@/components/ArticleBody";

type BlogPostData = {
  id: string;
  title: string;
  excerpt: string | null;
  body: string;
  imageUrl: string | null;
  hidden: boolean;
  publishAt: string | Date | null;
};

type PublishMode = "publish" | "draft" | "schedule";

// datetime-local inputs want "YYYY-MM-DDTHH:mm" in the viewer's own local
// time — toISOString() would silently shift it to UTC, so build it by hand.
function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function initialMode(post?: BlogPostData): PublishMode {
  if (!post) return "publish";
  if (isScheduled(post.publishAt)) return "schedule";
  if (post.hidden) return "draft";
  return "publish";
}

export default function BlogForm({ post }: { post?: BlogPostData }) {
  const router = useRouter();
  const isEdit = !!post;
  const [title, setTitle] = useState(post?.title ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [body, setBody] = useState(post?.body ?? "");
  const [mode, setMode] = useState<PublishMode>(initialMode(post));
  const [scheduledFor, setScheduledFor] = useState(
    post?.publishAt ? toDatetimeLocalValue(new Date(post.publishAt)) : ""
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(post?.imageUrl ?? null);
  const [imageUrlInput, setImageUrlInput] = useState(post?.imageUrl ?? "");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [compressingImage, setCompressingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const inlineImageInputRef = useRef<HTMLInputElement>(null);
  const [insertingImage, setInsertingImage] = useState(false);

  // Splices a snippet into the body at the current cursor position, padded
  // with blank lines so the image/video parser sees it as its own block —
  // falls back to appending if the textarea isn't focused/mounted yet.
  function insertAtCursor(snippet: string) {
    const textarea = bodyRef.current;
    if (!textarea) {
      setBody((b) => (b ? `${b}\n\n${snippet}\n\n` : snippet));
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    setBody((b) => {
      const before = b.slice(0, start);
      const after = b.slice(end);
      const leadingBreak = before && !before.endsWith("\n\n") ? "\n\n" : "";
      const trailingBreak = after && !after.startsWith("\n\n") ? "\n\n" : "";
      return `${before}${leadingBreak}${snippet}${trailingBreak}${after}`;
    });
    requestAnimationFrame(() => textarea.focus());
  }

  async function handleInsertImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!file) return;
    setError(null);
    setInsertingImage(true);

    let toUpload: File;
    try {
      toUpload = await compressImage(file);
    } catch {
      if (file.size > 5 * 1024 * 1024) {
        setError("Image must be under 5MB");
        setInsertingImage(false);
        return;
      }
      toUpload = file;
    }

    const uploadRes = await fetch(`/api/upload?filename=${encodeURIComponent(toUpload.name)}`, {
      method: "POST",
      headers: { "Content-Type": toUpload.type },
      body: toUpload,
    });
    setInsertingImage(false);

    if (!uploadRes.ok) {
      const data = await uploadRes.json();
      setError(data.error || "Failed to upload image");
      return;
    }
    const { url } = await uploadRes.json();
    insertAtCursor(`![](${url})`);
  }

  function handleInsertVideo() {
    const url = window.prompt("Paste a YouTube, Vimeo, Instagram, X/Twitter, TikTok, or Facebook link:");
    if (!url) return;
    if (!socialEmbedUrl(url.trim())) {
      setError("That doesn't look like a supported video/post link");
      return;
    }
    setError(null);
    insertAtCursor(url.trim());
  }

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setError(null);
    if (!file) {
      setImageFile(null);
      setImagePreview(imageUrlInput || null);
      return;
    }

    setCompressingImage(true);
    try {
      const compressed = await compressImage(file);
      setImageFile(compressed);
      setImageUrlInput(""); // file and URL are alternatives — picking one clears the other
      setImagePreview(URL.createObjectURL(compressed));
    } catch {
      if (file.size > 5 * 1024 * 1024) {
        setError("Image must be under 5MB");
        setCompressingImage(false);
        return;
      }
      setImageFile(file);
      setImageUrlInput("");
      setImagePreview(URL.createObjectURL(file));
    }
    setCompressingImage(false);
  }

  function handleImageUrlChange(value: string) {
    setImageUrlInput(value);
    setImageFile(null); // URL and file are alternatives — picking one clears the other
    setImagePreview(value || null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    let publishAt: string | null = null;
    if (mode === "schedule") {
      if (!scheduledFor) {
        setError("Pick a date and time to schedule this for");
        return;
      }
      const when = new Date(scheduledFor);
      if (when.getTime() <= Date.now()) {
        setError("Scheduled time must be in the future");
        return;
      }
      publishAt = when.toISOString();
    } else if (mode === "publish") {
      publishAt = new Date().toISOString();
    }

    setLoading(true);
    setError(null);

    let imageUrl: string | null;
    if (imageFile) {
      setUploadingImage(true);
      const uploadRes = await fetch(`/api/upload?filename=${encodeURIComponent(imageFile.name)}`, {
        method: "POST",
        headers: { "Content-Type": imageFile.type },
        body: imageFile,
      });
      setUploadingImage(false);

      if (!uploadRes.ok) {
        const data = await uploadRes.json();
        setError(data.error || "Failed to upload image");
        setLoading(false);
        return;
      }
      ({ url: imageUrl } = await uploadRes.json());
    } else {
      imageUrl = imageUrlInput.trim() || null;
    }

    const payload = {
      title,
      excerpt: excerpt || undefined,
      body,
      imageUrl: imageUrl || undefined,
      hidden: mode === "draft",
      publishAt,
    };

    const res = await fetch(isEdit ? `/api/admin/blog/${post!.id}` : "/api/admin/blog", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      const fieldError = data.error?.fieldErrors && (Object.values(data.error.fieldErrors) as string[][])[0]?.[0];
      setError(fieldError || data.error?.formErrors?.[0] || "Failed to save article");
      return;
    }

    router.push("/kitchen/table-talk");
    router.refresh();
  }

  const submitLabel = loading
    ? uploadingImage
      ? "Uploading photo..."
      : "Saving..."
    : mode === "draft"
    ? "Save as draft"
    : mode === "schedule"
    ? isEdit
      ? "Save & schedule"
      : "Schedule article"
    : isEdit
    ? "Save changes"
    : "Publish article";

  // Rough stand-in for the real /table-talk/[slug] byline: the actual live
  // post uses `author.name`, which an unsaved draft doesn't have yet — the
  // vast majority of articles are posted from the house team account, so
  // that's a reasonable approximation for "does this look right" purposes.
  const previewDate =
    mode === "schedule" && scheduledFor && !isNaN(new Date(scheduledFor).getTime())
      ? formatScheduled(new Date(scheduledFor))
      : new Date().toLocaleDateString();

  return (
    <div className="max-w-xl mx-auto bg-white p-6 rounded-lg border">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">{isEdit ? "Edit article" : "Write a new article"}</h1>
        <div className="flex text-xs border rounded overflow-hidden shrink-0">
          <button
            type="button"
            onClick={() => setPreviewing(false)}
            className={`px-2.5 py-1 font-medium ${!previewing ? "bg-gray-800 text-white" : "hover:bg-gray-50"}`}
          >
            ✏️ Edit
          </button>
          <button
            type="button"
            onClick={() => setPreviewing(true)}
            className={`px-2.5 py-1 font-medium ${previewing ? "bg-gray-800 text-white" : "hover:bg-gray-50"}`}
          >
            👁 Preview
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {previewing ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Preview — comments and votes aren't shown here
            </p>
            <div className="bg-white rounded-lg border p-6">
              <h1 className="text-2xl font-bold">{title || "Untitled article"}</h1>
              <p className="text-sm text-gray-500 mt-1">By LunchSpecial Team · {previewDate}</p>
              {imagePreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imagePreview}
                  alt={title}
                  className="mt-4 w-full max-h-[500px] object-contain rounded-lg border bg-gray-50"
                />
              )}
              <div className="mt-4">
                <ArticleBody body={body || "*Nothing written yet.*"} />
              </div>
            </div>
          </div>
        ) : (
          <>
            <input
              type="text"
              placeholder="Title"
              required
              minLength={3}
              className="border rounded px-3 py-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              placeholder="Excerpt (optional) — short summary shown in the article list"
              rows={2}
              maxLength={300}
              className="border rounded px-3 py-2"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
            />

            <div>
              <p className="text-sm font-medium mb-1">Cover photo (optional)</p>
              <p className="text-xs text-gray-400 mb-1.5">
                Shown at the top of the article and as its thumbnail in the Table Talk list.
              </p>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleImageSelect}
                className="text-sm"
              />
              {compressingImage && <p className="text-xs text-gray-400 mt-1">Compressing image...</p>}
              <p className="text-xs text-gray-400 my-1.5">— or —</p>
              <input
                type="url"
                placeholder="Paste a link to an image instead"
                className="border rounded px-3 py-2 text-sm w-full"
                value={imageUrlInput}
                onChange={(e) => handleImageUrlChange(e.target.value)}
              />
              {imagePreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="mt-2 h-32 w-32 object-cover rounded border"
                />
              )}
            </div>

            <div>
              <textarea
                ref={bodyRef}
                placeholder="Article body — separate paragraphs with a blank line"
                required
                minLength={10}
                rows={14}
                className="border rounded px-3 py-2 w-full"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
              <div className="flex items-center gap-2 mt-1.5">
                <button
                  type="button"
                  disabled={insertingImage}
                  onClick={() => inlineImageInputRef.current?.click()}
                  className="text-xs border rounded px-2.5 py-1 font-medium hover:bg-gray-50 disabled:opacity-50"
                >
                  {insertingImage ? "Uploading..." : "🖼 Insert image"}
                </button>
                <button
                  type="button"
                  onClick={handleInsertVideo}
                  className="text-xs border rounded px-2.5 py-1 font-medium hover:bg-gray-50"
                >
                  🎬 Insert video/post link
                </button>
                <input
                  ref={inlineImageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleInsertImageFile}
                  className="hidden"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Puts the photo or video link at your cursor, on its own line — separate paragraphs with a
                blank line.
              </p>
            </div>
          </>
        )}

        <div className="flex flex-col gap-2 border rounded px-3 py-2.5">
          <p className="text-sm font-medium">Publishing</p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="publishMode"
              checked={mode === "publish"}
              onChange={() => setMode("publish")}
            />
            Publish immediately
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="publishMode"
              checked={mode === "draft"}
              onChange={() => setMode("draft")}
            />
            Save as draft (hidden — only admins can see it)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="publishMode"
              checked={mode === "schedule"}
              onChange={() => setMode("schedule")}
            />
            Schedule for later
          </label>
          {mode === "schedule" && (
            <input
              type="datetime-local"
              required
              className="border rounded px-3 py-2 text-sm"
              value={scheduledFor}
              min={toDatetimeLocalValue(new Date(Date.now() + 5 * 60 * 1000))}
              onChange={(e) => setScheduledFor(e.target.value)}
            />
          )}
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading || compressingImage}
            className="bg-orange-600 text-white rounded py-2 px-4 font-medium disabled:opacity-50"
          >
            {submitLabel}
          </button>
          <button type="button" onClick={() => router.back()} className="border rounded py-2 px-4 font-medium">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
