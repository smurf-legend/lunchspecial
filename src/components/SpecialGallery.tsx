"use client";
import { useState } from "react";
import SpecialImage from "@/components/SpecialImage";

export default function SpecialGallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <SpecialImage src={null} alt={alt} className="mt-4 aspect-video w-full rounded-lg border" iconClassName="text-5xl" />
    );
  }

  return (
    <div className="mt-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={images[active]}
        alt={alt}
        className="w-full max-h-[500px] object-contain rounded-lg border bg-gray-50"
      />
      {images.length > 1 && (
        <div className="flex gap-2 mt-2 overflow-x-auto">
          {images.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setActive(i)}
              className={`shrink-0 rounded border-2 ${
                i === active ? "border-orange-600" : "border-transparent"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`${alt} photo ${i + 1}`} className="h-20 w-20 object-cover rounded" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
