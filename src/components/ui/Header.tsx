import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Header() {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        {/* Site name */}
        <Link href="/" className="font-semibold">
          책판
        </Link>

        {/* Search bar */}
        <form action="/search" className="flex-1">
          <Input name="q" placeholder="책 찾기" />
        </form>

        {/* Login */}
        <Link href="/login">
          <Button size="sm">로그인</Button>
        </Link>
      </div>
    </header>
  );
}
