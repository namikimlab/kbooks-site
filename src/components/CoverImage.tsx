// components/CoverImage.tsx
"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

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
  const inlinePlaceholder = useMemo(() => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="360" height="540" viewBox="0 0 120 180">
        <rect width="120" height="180" rx="8" fill="#f4f4f5"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="14" fill="#a1a1aa">
          표지 없음
        </text>
      </svg>
    `;
    return `data:image/svg+xml,${encodeURIComponent(svg.trim())}`;
  }, []);

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
          if (src !== inlinePlaceholder) setSrc(inlinePlaceholder);
        }}
      />
    </div>
  );
}
