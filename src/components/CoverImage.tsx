// components/CoverImage.tsx
"use client";

import Image from "next/image";
import { useState } from "react";

type Props = {
  isbn13: string;
  alt: string;
  // optional: let caller decide size; defaults work for detail page
  sizes?: string;
  priority?: boolean;
};

export default function CoverImage({
  isbn13,
  alt,
  sizes = "(max-width: 768px) 70vw, 360px",
  priority = true,
}: Props) {
  // Single API source of truth
  const apiSrc = `/api/covers/${isbn13}`;
  const [src, setSrc] = useState(apiSrc);

  return (
    <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-muted shadow-sm">
      <Image
        src={src}
        alt={alt}
        fill
        className="object-contain"
        priority={priority}
        sizes={sizes}
        // Final local fallback only if API somehow fails
        onError={() => {
          const localFallback = "/placeholder-cover.jpg";
          if (src !== localFallback) setSrc(localFallback);
        }}
      />
    </div>
  );
}
