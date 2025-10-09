// components/SearchHeader.tsx
"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

export default function SearchHeader() {
  return (
    <div className="border-b bg-background">
      <div className="mx-auto flex h-12 max-w-6xl items-center gap-2 px-4">
        <form
          action="/search"
          method="GET"
          className="flex flex-1 items-center gap-2"
          role="search"
          aria-label="책 검색"
        >
          <Input
            name="q"
            placeholder="책 찾기"
            required
            aria-label="검색어"
            className="flex-1"
          />
          <Button type="submit" size="sm" variant="secondary" aria-label="검색">
            <Search className="h-4 w-4" />
            <span className="sr-only">검색</span>
          </Button>
        </form>
      </div>
    </div>
  );
}
