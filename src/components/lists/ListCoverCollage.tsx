"use client";

import Image from "next/image";

type ListCoverCollageProps = {
  isbnList: string[];
};

export function ListCoverCollage({ isbnList }: ListCoverCollageProps) {
  const firstIsbn = isbnList[0];
  if (!firstIsbn) return null;

  return (
    <div className="mx-auto mb-6 flex w-full max-w-xs justify-center">
      <div className="w-36 sm:w-40">
        <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-border/50 bg-background shadow-md shadow-foreground/5">
          <Image
            src={`/api/thumbs/${firstIsbn}?v=inline`}
            alt="리스트 대표 표지"
            fill
            sizes="(max-width: 640px) 60vw, 200px"
            className="object-cover"
          />
        </div>
      </div>
    </div>
  );
}
