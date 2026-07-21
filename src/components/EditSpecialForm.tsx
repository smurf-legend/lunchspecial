"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { compressImage } from "@/lib/compressImage";
import SuburbPicker from "@/components/SuburbPicker";
import { specialSlug } from "@/lib/slugify";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Option = { name: string; slug: string };
type SuburbOption = { name: string; slug: string; region: string; state: string };

type SpecialData = {
  id: string;
  title: string;
  description: string;
  venueName: string;
  address: string | null;
  url: string | null;
  imageUrl: string | null;
  extraImageUrls: string[];
  couponCode: string | null;
  usualPrice: number | null;
  specialPrice: number | null;
  discountPercent: number | null;
  availableDays: string;
  startTime: string | null;
  endTime: string | null;
  expiresAt: string | Date | null;
  suburbs: { suburb: { slug: string } }[];
  chainWide: boolean;
  greatValue: boolean;
  categories: { category: { slug: string } }[];
};

export default function EditSpecialForm({
  special,
  suburbs,
  categories: initialCategories,
  apiBase = "/api/admin/specials",
}: {
  special: SpecialData;
  suburbs: SuburbOption[];
  categories: Option[];
  apiBase?: string;
}) {
  const router = useRouter();
  const [categories, setCategories] = useState(initialCategories);
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [locationMode, setLocationMode] = useState<"single" | "chain" | "chainWide">(
    special.chainWide ? "chainWide" : special.suburbs.length > 1 ? "chain" : "single"
  );
  const [greatValue, setGreatValue] = useState(special.greatValue);
  const [anyTime, setAnyTime] = useState(!special.startTime && !special.endTime);
  const [priceMode, setPriceMode] = useState<"fixed" | "percent">(
    special.discountPercent != null ? "percent" : "fixed"
  );
  const [form, setForm] = useState({
    title: special.title,
    description: special.description,
    venueName: special.venueName,
    address: special.address ?? "",
    url: special.url ?? "",
    couponCode: special.couponCode ?? "",
    suburbSlugs: special.suburbs.map((s) => s.suburb.slug),
    usualPrice: special.usualPrice?.toString() ?? "",
    specialPrice: special.specialPrice?.toString() ?? "",
    discountPercent: special.discountPercent?.toString() ?? "",
    availableDays: special.availableDays.split(",").filter(Boolean),
    startTime: special.startTime ?? "11:30",
    endTime: special.endTime ?? "14:00",
    categorySlugs: special.categories.map((c) => c.category.slug),
    expiresAt: special.expiresAt ? new Date(special.expiresAt).toISOString().split("T")[0] : "",
  });
  const [existingImages, setExistingImages] = useState<string[]>(
    special.imageUrl ? [special.imageUrl, ...special.extraImageUrls] : special.extraImageUrls
  );
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [compressingImage, setCompressingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

    setCompressingImage(true);
    for (const file of files) {
      try {
        const compressed = await compressImage(file);
        setNewImageFiles((prev) => [...prev, compressed]);
        setNewImagePreviews((prev) => [...prev, URL.createObjectURL(compressed)]);
      } catch {
        if (file.size > 5 * 1024 * 1024) {
          setError(`"${file.name}" is over 5MB — skipped`);
          continue;
        }
        setNewImageFiles((prev) => [...prev, file]);
        setNewImagePreviews((prev) => [...prev, URL.createObjectURL(file)]);
      }
    }
    setCompressingImage(false);
  }

  function removeExistingImage(index: number) {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  }

  function removeNewImageFile(index: number) {
    setNewImageFiles((prev) => prev.filter((_, i) => i !== index));
    setNewImagePreviews((prev) => prev.filter((_, i) => i !== index));
  }

  function addImageUrl() {
    const url = imageUrlInput.trim();
    if (!url) return;
    setExistingImages((prev) => [...prev, url]);
    setImageUrlInput("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const uploadedUrls: string[] = [];
    if (newImageFiles.length > 0) {
      setUploadingImage(true);
      for (const file of newImageFiles) {
        const uploadRes = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!uploadRes.ok) {
          setUploadingImage(false);
          const data = await uploadRes.json();
          setError(data.error || "Failed to upload image");
          setLoading(false);
          return;
        }
        const { url } = await uploadRes.json();
        uploadedUrls.push(url);
      }
      setUploadingImage(false);
    }

    const allImages = [...existingImages, ...uploadedUrls];

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
      usualPrice: priceMode === "fixed" && form.usualPrice ? parseFloat(form.usualPrice) : null,
      specialPrice: priceMode === "fixed" ? parseFloat(form.specialPrice) : null,
      discountPercent: priceMode === "percent" ? parseInt(form.discountPercent, 10) : null,
      availableDays: form.availableDays.join(","),
      startTime: anyTime ? null : form.startTime || undefined,
      endTime: anyTime ? null : form.endTime || undefined,
      categorySlugs: form.categorySlugs,
      imageUrl: allImages[0] ?? null,
      extraImageUrls: allImages.slice(1),
      expiresAt: form.expiresAt || undefined,
    };

    const res = await fetch(`${apiBase}/${special.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      const fieldError = data.error?.fieldErrors && (Object.values(data.error.fieldErrors) as string[][])[0]?.[0];
      setError(fieldError || data.error?.formErrors?.[0] || "Failed to save changes");
      return;
    }

    router.push(`/specials/${specialSlug({ id: special.id, title: form.title, venueName: form.venueName })}`);
    router.refresh();
  }

  return (
    <div className="max-w-xl mx-auto bg-white p-6 rounded-lg border">
      <h1 className="text-xl font-bold mb-4">Edit lunch special</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          placeholder="Title"
          required
          minLength={5}
          className="border rounded px-3 py-2"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <textarea
          placeholder="Description"
          required
          minLength={10}
          rows={3}
          className="border rounded px-3 py-2"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <input
          type="text"
          placeholder="Venue name"
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
              { value: "chainWide", label: "All Sydney locations (nationwide chain, e.g. McDonald's)" },
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
            <select
              required
              className="border rounded px-3 py-2 w-full"
              value={form.suburbSlugs[0] ?? ""}
              onChange={(e) => setForm({ ...form, suburbSlugs: e.target.value ? [e.target.value] : [] })}
            >
              <option value="">Select suburb...</option>
              {suburbs.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.name} ({s.state})
                </option>
              ))}
            </select>
          )}
          {locationMode === "chainWide" && (
            <p className="text-xs text-gray-500">
              This deal will show up in every suburb search — only use this for genuinely
              nationwide chains with consistent participation.
            </p>
          )}
        </div>

        <div className="flex gap-2 text-sm">
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
        </div>

        {priceMode === "fixed" ? (
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
        ) : (
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
            className="border rounded px-3 py-2"
            value={form.expiresAt}
            onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
          />
          <p className="text-xs text-gray-400 mt-1">
            Leave blank for an ongoing/recurring special. Clear this field to remove an expiry —
            or set it to a past date to mark the deal expired immediately.
          </p>
        </div>

        <div>
          <p className="text-sm font-medium mb-1">Photos</p>
          {(existingImages.length > 0 || newImagePreviews.length > 0) && (
            <div className="flex flex-wrap gap-2 mb-2">
              {existingImages.map((url, i) => (
                <div key={`existing-${i}`} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Photo ${i + 1}`} className="h-24 w-24 object-cover rounded border" />
                  {i === 0 && (
                    <span className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                      Cover
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeExistingImage(i)}
                    className="absolute -top-1.5 -right-1.5 bg-white border rounded-full w-5 h-5 text-xs leading-none hover:bg-gray-50"
                    aria-label={`Remove photo ${i + 1}`}
                  >
                    ×
                  </button>
                </div>
              ))}
              {newImagePreviews.map((preview, i) => (
                <div key={`new-${i}`} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="New photo" className="h-24 w-24 object-cover rounded border" />
                  {existingImages.length === 0 && i === 0 && (
                    <span className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                      Cover
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeNewImageFile(i)}
                    className="absolute -top-1.5 -right-1.5 bg-white border rounded-full w-5 h-5 text-xs leading-none hover:bg-gray-50"
                    aria-label="Remove photo"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            onChange={handleImageSelect}
            className="text-sm"
          />
          {compressingImage && <p className="text-xs text-gray-400 mt-1">Compressing image(s)...</p>}
          <p className="text-xs text-gray-400 my-1.5">— or add a link to another image —</p>
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="Paste a link to an image"
              className="border rounded px-3 py-2 text-sm w-full"
              value={imageUrlInput}
              onChange={(e) => setImageUrlInput(e.target.value)}
            />
            <button
              type="button"
              onClick={addImageUrl}
              disabled={!imageUrlInput.trim()}
              className="text-sm border px-3 py-1 rounded font-medium disabled:opacity-50 shrink-0"
            >
              Add
            </button>
          </div>
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

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex gap-2">
          <button
            disabled={loading || compressingImage}
            className="bg-orange-600 text-white rounded py-2 px-4 font-medium disabled:opacity-50"
          >
            {loading ? (uploadingImage ? "Uploading photos..." : "Saving...") : "Save changes"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="border rounded py-2 px-4 font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
