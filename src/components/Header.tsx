import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

export default function Header() {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        {/* Site name */}
        <Link href="/" className="font-semibold">
          책판
        </Link>

        {/* Search bar */}
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
            required // prevent empty submits
            aria-label="검색어"
          />
          <Button type="submit" size="sm" variant="secondary" aria-label="검색">
            <Search className="h-4 w-4" />
            <span className="sr-only">검색</span>
          </Button>
        </form>


        {/* Login */}
        <Link href="/login">
          <Button size="sm">로그인</Button>
        </Link>
      </div>
    </header>
  );
}
