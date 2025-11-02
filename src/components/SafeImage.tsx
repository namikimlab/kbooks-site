// components/SafeImage.tsx
"use client";

import Image, { ImageProps } from "next/image";
import { useState } from "react";

/**
 * Next.js Image wrapper that swaps to /placeholder-cover.png if load fails
 */
export function SafeImage(props: ImageProps) {
  const [src, setSrc] = useState(props.src);

  return (
    <Image
      {...props}
      src={src}
      onError={() => setSrc("/placeholder-cover.png")}
      alt={props.alt ?? "이미지 없음"}
    />
  );
}
