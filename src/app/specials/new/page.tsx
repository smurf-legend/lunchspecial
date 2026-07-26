"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { compressImage } from "@/lib/compressImage";
import SuburbPicker from "@/components/SuburbPicker";
import SuburbAutocomplete from "@/components/SuburbAutocomplete";
import { specialSlug } from "@/lib/slugify";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Option = { name: string; slug: string };
type SuburbOption = { name: string; slug: string; postcode: string; region: string; state: string };

export default function NewSpecialPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [suburbs, setSuburbs] = useState<SuburbOption[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [locationMode, setLocationMode] = useState<"single" | "chain" | "chainWide">("single");
  const [greatValue, setGreatValue] = useState(false);
  const [anyTime, setAnyTime] = useState(false);
  const [priceMode, setPriceMode] = useState<"fixed" | "percent" | "range">("fixed");
  const [form, setForm] = useState({
    title: "",
    description: "",
    venueName: "",
    address: "",
    url: "",
    couponCode: "",
    suburbSlugs: [] as string[],
    usualPrice: "",
    specialPrice: "",
    discountPercent: "",
    priceRangeMin: "",
    priceRangeMax: "",
    availableDays: ["Mon", "Tue", "Wed", "Thu", "Fri"] as string[],
    startTime: "11:30",
    endTime: "14:00",
    categorySlugs: [] as string[],
    expiresAt: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [compressingImage, setCompressingImage] = useState(false);
  const [duplicates, setDuplicates] = useState<
    {
      id: string;
      title: string;
      specialPrice: number | null;
      discountPercent: number | null;
      priceRangeMin: number | null;
      priceRangeMax: number | null;
      venueName: string;
      suburbNames: string[];
    }[] | null
  >(null);
  const [pendingImageUrls, setPendingImageUrls] = useState<string[]>([]);
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);

  useEffect(() => {
    fetch("/api/meta")
      .then((r) => r.json())
      .then((data) => {
        setSuburbs(data.suburbs ?? []);
        setCategories(data.categories ?? []);
      });
  }, []);

  if (status === "loading") return null;

  if (!session) {
    return (
      <div className="max-w-md mx-auto bg-white p-6 rounded-lg border text-center">
        <p className="mb-3">You need to be logged in to post a lunch special.</p>
        <Link href="/login" className="text-orange-600 underline font-medium">
          Log in
        </Link>
      </div>
    );
  }

  function toggleDay(day: string) {
    setForm((f) => ({
      ...f,
      availableDays: f.availableDays.includes(day)
        ? f.availableDays.filter((d) => d !== day)
        : [...f.availableDays, day],
    }));
  }

  function toggleCategory(slug: string) {
    setForm((f) => ({
      ...f,
      categorySlugs: f.categorySlugs.includes(slug)
        ? f.categorySlugs.filter((s) => s !== slug)
        : [...f.categorySlugs, slug],
    }));
  }

  async function handleAddCategory() {
    const name = newCategoryInput.trim();
    if (!name) return;
    setAddingCategory(true);
    setError(null);

    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setAddingCategory(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to add category");
      return;
    }

    const { category } = await res.json();
    setCategories((prev) =>
      prev.some((c) => c.slug === category.slug) ? prev : [...prev, category].sort((a, b) => a.name.localeCompare(b.name))
    );
    setForm((f) => ({ ...f, categorySlugs: [...f.categorySlugs, category.slug] }));
    setNewCategoryInput("");
  }

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // allow re-selecting the same file(s) later
    if (files.length === 0) return;
    setError(null);

    setImageUrlInput(""); // files and URL are alternatives — picking one clears the other
    setCompressingImage(true);
    for (const file of files) {
      try {
        const compressed = await compressImage(file);
        setImageFiles((prev) => [...prev, compressed]);
        setImagePreviews((prev) => [...prev, URL.createObjectURL(compressed)]);
      } catch {
        // Compression isn't supported in this browser — fall back to the
        // original file and let the server-side 5MB cap be the safety net.
        if (file.size > 5 * 1024 * 1024) {
          setError(`"${file.name}" is over 5MB — skipped`);
          continue;
        }
        setImageFiles((prev) => [...prev, file]);
        setImagePreviews((prev) => [...prev, URL.createObjectURL(file)]);
      }
    }
    setCompressingImage(false);
  }

  function removeImageFile(index: number) {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  }

  // Moves a photo to the front — index 0 is always what gets submitted as
  // the cover (`imageUrl`), the rest become `extraImageUrls`.
  function makeCoverImage(index: number) {
    function moveToFront<T>(arr: T[]): T[] {
      const next = [...arr];
      const [item] = next.splice(index, 1);
      next.unshift(item);
      return next;
    }
    setImageFiles(moveToFront);
    setImagePreviews(moveToFront);
  }

  function handleImageUrlChange(value: string) {
    setImageUrlInput(value);
    if (value) {
      // URL and files are alternatives — picking one clears the other
      setImageFiles([]);
      setImagePreviews([]);
    }
  }

  async function resolveImageUrls(): Promise<{ urls?: string[]; error?: string }> {
    if (imageFiles.length > 0) {
      setUploadingImage(true);
      const urls: string[] = [];
      const label = form.venueName || form.title;
      for (const file of imageFiles) {
        const uploadRes = await fetch(
          `/api/upload?filename=${encodeURIComponent(file.name)}${label ? `&label=${encodeURIComponent(label)}` : ""}`,
          {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!uploadRes.ok) {
          setUploadingImage(false);
          const data = await uploadRes.json();
          return { error: data.error || "Failed to upload image" };
        }
        const { url } = await uploadRes.json();
        urls.push(url);
      }
      setUploadingImage(false);
      return { urls };
    }
    if (imageUrlInput.trim()) return { urls: [imageUrlInput.trim()] };
    return { urls: [] };
  }

  async function postSpecial(imageUrls: string[], confirmDuplicate: boolean) {
    const payload = {
      title: form.title,
      description: form.description,
      venueName: form.venueName,
      address: form.address || undefined,
      url: form.url || undefined,
      couponCode: form.couponCode || undefined,
      suburbSlugs: form.suburbSlugs,
      chainWide: locationMode === "chainWide",
      greatValue,
      usualPrice: priceMode === "fixed" && form.usualPrice ? parseFloat(form.usualPrice) : undefined,
      specialPrice: priceMode === "fixed" ? parseFloat(form.specialPrice) : undefined,
      discountPercent: priceMode === "percent" ? parseInt(form.discountPercent, 10) : undefined,
      priceRangeMin: priceMode === "range" ? parseFloat(form.priceRangeMin) : undefined,
      priceRangeMax: priceMode === "range" ? parseFloat(form.priceRangeMax) : undefined,
      availableDays: form.availableDays.join(","),
      startTime: anyTime ? undefined : form.startTime || undefined,
      endTime: anyTime ? undefined : form.endTime || undefined,
      categorySlugs: form.categorySlugs,
      imageUrl: imageUrls[0],
      extraImageUrls: imageUrls.slice(1),
      expiresAt: form.expiresAt || undefined,
      confirmDuplicate,
    };

    return fetch("/api/specials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setDuplicates(null);

    const { urls: imageUrls, error: imageError } = await resolveImageUrls();
    if (imageError) {
      setError(imageError);
      setLoading(false);
      return;
    }

    const res = await postSpecial(imageUrls ?? [], false);
    setLoading(false);

    if (res.status === 409) {
      const data = await res.json();
      setDuplicates(data.duplicates);
      setPendingImageUrls(imageUrls ?? []);
      return;
    }

    if (!res.ok) {
      const data = await res.json();
      const fieldError = data.error?.fieldErrors && (Object.values(data.error.fieldErrors) as string[][])[0]?.[0];
      setError(fieldError || data.error?.formErrors?.[0] || "Failed to post lunch special");
      return;
    }

    const { special } = await res.json();
    router.push(`/specials/${specialSlug(special)}`);
  }

  async function handlePostAnyway() {
    setLoading(true);
    setError(null);
    const res = await postSpecial(pendingImageUrls, true);
    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      const fieldError = data.error?.fieldErrors && (Object.values(data.error.fieldErrors) as string[][])[0]?.[0];
      setError(fieldError || data.error?.formErrors?.[0] || "Failed to post lunch special");
      return;
    }

    const { special } = await res.json();
    router.push(`/specials/${specialSlug(special)}`);
  }

  return (
    <div className="max-w-xl mx-auto bg-white p-6 rounded-lg border">
      <h1 className="text-xl font-bold mb-4">Post a lunch special</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          placeholder="Title (e.g. $12 banh mi + drink combo)"
          required
          minLength={5}
          className="border rounded px-3 py-2"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <textarea
          placeholder="Description — what's included, anything to know"
          required
          minLength={10}
          rows={12}
          className="border rounded px-3 py-2"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <input
          type="text"
          placeholder="Venue name (e.g. Banh Mi Corner)"
          required
          className="border rounded px-3 py-2"
          value={form.venueName}
          onChange={(e) => setForm({ ...form, venueName: e.target.value })}
        />
        <div>
          <input
            type="text"
            placeholder="Address, or paste a Google Maps link (optional)"
            className="border rounded px-3 py-2 w-full"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          {locationMode === "chain" && (
            <p className="text-xs text-gray-400 mt-1">
              Only shown for single-location specials — with multiple suburbs selected, this
              won't be displayed since it can only point to one of them.
            </p>
          )}
        </div>
        <input
          type="url"
          placeholder="Link to source (optional)"
          className="border rounded px-3 py-2"
          value={form.url}
          onChange={(e) => setForm({ ...form, url: e.target.value })}
        />
        <input
          type="text"
          placeholder="Coupon/deal code, if the vendor provides one (optional)"
          className="border rounded px-3 py-2"
          value={form.couponCode}
          onChange={(e) => setForm({ ...form, couponCode: e.target.value })}
        />

        <div>
          <p className="text-sm font-medium mb-2">Locations</p>
          <div className="flex flex-col gap-1.5 mb-2">
            {[
              { value: "single", label: "Single suburb" },
              { value: "chain", label: "Multiple suburbs (select specific locations)" },
              { value: "chainWide", label: "All Stores (nationwide chain, e.g. McDonald's)" },
            ].map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="radio"
                  name="locationMode"
                  checked={locationMode === opt.value}
                  onChange={() => {
                    setLocationMode(opt.value as typeof locationMode);
                    setForm({ ...form, suburbSlugs: [] });
                  }}
                />
                {opt.label}
              </label>
            ))}
          </div>

          {locationMode === "chain" && (
            <SuburbPicker
              suburbs={suburbs}
              selected={form.suburbSlugs}
              onChange={(slugs) => setForm({ ...form, suburbSlugs: slugs })}
            />
          )}
          {locationMode === "single" && (
            <SuburbAutocomplete
              suburbs={suburbs}
              value={form.suburbSlugs[0] ?? null}
              onChange={(slug) => setForm({ ...form, suburbSlugs: slug ? [slug] : [] })}
              allowAdd
            />
          )}
          {locationMode === "chainWide" && (
            <p className="text-xs text-gray-500">
              This deal will show up in every suburb search — only use this for genuinely
              nationwide chains with consistent participation.
            </p>
          )}
        </div>

        <div className="flex gap-2 text-sm flex-wrap">
          <button
            type="button"
            onClick={() => setPriceMode("fixed")}
            className={`px-3 py-1 rounded-full font-medium ${
              priceMode === "fixed" ? "bg-orange-600 text-white" : "bg-white border"
            }`}
          >
            Fixed price
          </button>
          <button
            type="button"
            onClick={() => setPriceMode("percent")}
            className={`px-3 py-1 rounded-full font-medium ${
              priceMode === "percent" ? "bg-orange-600 text-white" : "bg-white border"
            }`}
          >
            Percentage off
          </button>
          <button
            type="button"
            onClick={() => setPriceMode("range")}
            className={`px-3 py-1 rounded-full font-medium ${
              priceMode === "range" ? "bg-orange-600 text-white" : "bg-white border"
            }`}
          >
            Price range
          </button>
        </div>

        {priceMode === "fixed" && (
          <div className="flex gap-3">
            <input
              type="number"
              step="0.01"
              placeholder="Special price"
              required
              className="border rounded px-3 py-2 flex-1 min-w-0"
              value={form.specialPrice}
              onChange={(e) => setForm({ ...form, specialPrice: e.target.value })}
            />
            <input
              type="number"
              step="0.01"
              placeholder="Usual price (optional)"
              className="border rounded px-3 py-2 flex-1 min-w-0"
              value={form.usualPrice}
              onChange={(e) => setForm({ ...form, usualPrice: e.target.value })}
            />
          </div>
        )}
        {priceMode === "percent" && (
          <div>
            <input
              type="number"
              step="1"
              min="1"
              max="100"
              placeholder="Discount percentage, e.g. 20"
              required
              className="border rounded px-3 py-2 w-full"
              value={form.discountPercent}
              onChange={(e) => setForm({ ...form, discountPercent: e.target.value })}
            />
            <p className="text-xs text-gray-500 mt-1">
              For deals like "20% off anything on the menu" with no single fixed price.
            </p>
          </div>
        )}
        {priceMode === "range" && (
          <div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                step="0.01"
                placeholder="From $"
                required
                className="border rounded px-3 py-2 flex-1 min-w-0"
                value={form.priceRangeMin}
                onChange={(e) => setForm({ ...form, priceRangeMin: e.target.value })}
              />
              <span className="text-gray-400">–</span>
              <input
                type="number"
                step="0.01"
                placeholder="To $"
                required
                className="border rounded px-3 py-2 flex-1 min-w-0"
                value={form.priceRangeMax}
                onChange={(e) => setForm({ ...form, priceRangeMax: e.target.value })}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              For a whole specials menu spanning several price points (e.g. a full set of
              entrées and mains), rather than one specific item.
            </p>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={greatValue}
            onChange={(e) => setGreatValue(e.target.checked)}
          />
          💎 Everyday value — exceptional price for what you get (doesn't need to be discounted)
        </label>

        <div>
          <p className="text-sm font-medium mb-1">Available days</p>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((day) => (
              <button
                type="button"
                key={day}
                onClick={() => toggleDay(day)}
                className={`text-sm px-3 py-1 rounded-full border ${
                  form.availableDays.includes(day)
                    ? "bg-orange-600 text-white border-orange-600"
                    : "bg-white"
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Time window</label>
          <div className="flex gap-3">
            <input
              type="time"
              disabled={anyTime}
              className="border rounded px-3 py-2 flex-1 disabled:opacity-50 disabled:bg-gray-50"
              value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
            />
            <input
              type="time"
              disabled={anyTime}
              className="border rounded px-3 py-2 flex-1 disabled:opacity-50 disabled:bg-gray-50"
              value={form.endTime}
              onChange={(e) => setForm({ ...form, endTime: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 mt-1.5">
            <input type="checkbox" checked={anyTime} onChange={(e) => setAnyTime(e.target.checked)} />
            Any time — not tied to specific hours
          </label>
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">
            Limited-time offer? Set an end date (optional)
          </label>
          <input
            type="date"
            min={new Date().toISOString().split("T")[0]}
            className="border rounded px-3 py-2"
            value={form.expiresAt}
            onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
          />
          <p className="text-xs text-gray-400 mt-1">
            Leave blank for an ongoing/recurring special. Once this date passes, the post is
            automatically marked "Expired" so people don't turn up expecting it.
          </p>
        </div>

        <div>
          <p className="text-sm font-medium mb-1">Photos (optional)</p>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            onChange={handleImageSelect}
            className="text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">
            Select multiple to add a gallery — the first one becomes the cover photo.
          </p>
          {compressingImage && <p className="text-xs text-gray-400 mt-1">Compressing image(s)...</p>}
          {imagePreviews.length === 0 && (
            <>
              <p className="text-xs text-gray-400 my-1.5">— or —</p>
              <input
                type="url"
                placeholder="Paste a link to an image instead"
                className="border rounded px-3 py-2 text-sm w-full"
                value={imageUrlInput}
                onChange={(e) => handleImageUrlChange(e.target.value)}
              />
            </>
          )}
          {imageUrlInput && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrlInput}
              alt="Preview"
              className="mt-2 h-32 w-32 object-cover rounded border"
            />
          )}
          {imagePreviews.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {imagePreviews.map((preview, i) => (
                <div key={i} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview}
                    alt={`Preview ${i + 1}`}
                    className="h-24 w-24 object-cover rounded border"
                  />
                  {i === 0 ? (
                    <span className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                      Cover
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => makeCoverImage(i)}
                      className="absolute bottom-1 left-1 right-1 bg-black/60 text-white text-[10px] px-1 py-0.5 rounded hover:bg-black/80"
                    >
                      Make cover
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImageFile(i)}
                    className="absolute -top-1.5 -right-1.5 bg-white border rounded-full w-5 h-5 text-xs leading-none hover:bg-gray-50"
                    aria-label={`Remove photo ${i + 1}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-sm font-medium mb-1">Cuisine tags</p>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                type="button"
                key={c.slug}
                onClick={() => toggleCategory(c.slug)}
                className={`text-sm px-3 py-1 rounded-full border ${
                  form.categorySlugs.includes(c.slug)
                    ? "bg-orange-600 text-white border-orange-600"
                    : "bg-white"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              placeholder="Don't see it? Add a new cuisine..."
              className="border rounded px-2 py-1 text-sm flex-1"
              value={newCategoryInput}
              onChange={(e) => setNewCategoryInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddCategory();
                }
              }}
            />
            <button
              type="button"
              onClick={handleAddCategory}
              disabled={addingCategory || !newCategoryInput.trim()}
              className="text-sm border px-3 py-1 rounded font-medium disabled:opacity-50"
            >
              {addingCategory ? "Adding..." : "Add"}
            </button>
          </div>
        </div>

        {duplicates && duplicates.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
            <p className="font-medium text-amber-800 mb-2">
              This looks like it might already be posted:
            </p>
            <ul className="list-disc list-inside text-amber-800 mb-3">
              {duplicates.map((d) => (
                <li key={d.id}>
                  <Link href={`/specials/${specialSlug(d)}`} target="_blank" className="underline hover:text-amber-900">
                    {d.title}
                  </Link>{" "}
                  — {d.venueName},{" "}
                  {d.specialPrice != null
                    ? `$${d.specialPrice.toFixed(2)}`
                    : d.discountPercent != null
                    ? `${d.discountPercent}% off`
                    : d.priceRangeMin != null && d.priceRangeMax != null
                    ? `$${d.priceRangeMin.toFixed(2)}–$${d.priceRangeMax.toFixed(2)}`
                    : ""}
                  {" ("}
                  {d.suburbNames.length > 0 ? d.suburbNames.join(", ") : "All Stores"})
                </li>
              ))}
            </ul>
            <p className="text-amber-700 mb-3">
              If this is a different deal at the same venue, you can post it anyway.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handlePostAnyway}
                disabled={loading}
                className="bg-amber-600 text-white text-sm px-3 py-1.5 rounded font-medium disabled:opacity-50"
              >
                {loading ? "Posting..." : "Post anyway"}
              </button>
              <button
                type="button"
                onClick={() => setDuplicates(null)}
                className="border text-sm px-3 py-1.5 rounded font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          disabled={loading || compressingImage}
          className="bg-orange-600 text-white rounded py-2 font-medium disabled:opacity-50"
        >
          {loading ? (uploadingImage ? "Uploading photos..." : "Posting...") : "Post lunch special"}
        </button>
      </form>
    </div>
  );
}
