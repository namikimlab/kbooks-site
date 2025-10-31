"use client";

import { useState } from "react";
import Image from "next/image";

type Props = {
  primarySrc: string;     // Kyobo
  fallbackSrc?: string | null; // Kakao (optional)
  alt: string;
};

export default function CoverImage({ primarySrc, fallbackSrc, alt }: Props) {
  const [src, setSrc] = useState(primarySrc);
  const [attemptedFallback, setAttemptedFallback] = useState(false);

  return (
    <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-muted shadow-sm">
      <Image
        src={src}
        alt={alt}
        fill
        className="object-contain"
        priority
        sizes="(max-width: 768px) 70vw, 360px"
        onError={() => {
          // Switch to Kakao once; if it also fails, show a gray box
          if (!attemptedFallback && fallbackSrc && src !== fallbackSrc) {
            setAttemptedFallback(true);
            setSrc(fallbackSrc);
          } else {
            // final placeholder (transparent 1x1 or keep gray box behind)
            // no further action needed: the gray bg-muted is visible
          }
        }}
      />
    </div>
  );
}
