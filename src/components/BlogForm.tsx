"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { compressImage } from "@/lib/compressImage";
import { videoEmbedUrl } from "@/lib/articleBlocks";

type BlogPostData = {
  id: string;
  title: string;
  excerpt: string | null;
  body: string;
  imageUrl: string | null;
  hidden: boolean;
};

export default function BlogForm({ post }: { post?: BlogPostData }) {
  const router = useRouter();
  const isEdit = !!post;
  const [title, setTitle] = useState(post?.title ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [body, setBody] = useState(post?.body ?? "");
  const [hidden, setHidden] = useState(post?.hidden ?? false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(post?.imageUrl ?? null);
  const [imageUrlInput, setImageUrlInput] = useState(post?.imageUrl ?? "");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [compressingImage, setCompressingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    const url = window.prompt("Paste a YouTube or Vimeo link:");
    if (!url) return;
    if (!videoEmbedUrl(url.trim())) {
      setError("That doesn't look like a YouTube or Vimeo link");
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
      ...(isEdit ? { hidden } : {}),
    };

    const res = await fetch(isEdit ? `/api/admin/blog/${post!.id}` : "/api/admin/blog", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(JSON.stringify(data.error) || "Failed to save article");
      return;
    }

    router.push("/kitchen/table-talk");
    router.refresh();
  }

  return (
    <div className="max-w-xl mx-auto bg-white p-6 rounded-lg border">
      <h1 className="text-xl font-bold mb-4">{isEdit ? "Edit article" : "Write a new article"}</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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
              🎬 Insert video link
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

        <div>
          <p className="text-sm font-medium mb-1">Cover photo (optional)</p>
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

        {isEdit && (
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} />
            Hidden (unpublished — only admins can view it)
          </label>
        )}

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex gap-2">
          <button
            disabled={loading || compressingImage}
            className="bg-orange-600 text-white rounded py-2 px-4 font-medium disabled:opacity-50"
          >
            {loading
              ? uploadingImage
                ? "Uploading photo..."
                : "Saving..."
              : isEdit
              ? "Save changes"
              : "Publish article"}
          </button>
          <button type="button" onClick={() => router.back()} className="border rounded py-2 px-4 font-medium">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
