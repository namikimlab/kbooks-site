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

        {/* Middle: Menus (take remaining space) */}
        <nav
          className="mx-6 flex flex-1 items-center gap-4 text-sm"
          aria-label="주요 메뉴"
        >
          <Link
            href="/weekly"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            주간 베스트
          </Link>
          <Link
            href="/life-list"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            인생 책 리스트
          </Link>
          {/* add more menu items here as needed */}
        </nav>

        {/* Login */}
        <Link href="/login" className="ml-auto">
          <Button size="sm">로그인</Button>
        </Link>
      </div>
    </header>
  );
}
