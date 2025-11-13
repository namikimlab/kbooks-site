// components/Header.tsx  ← server component (no "use client")
import Link from "next/link";
import AuthArea from "./AuthArea.client"; // 👈 new client-only part

export default function Header() {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        {/* Site name */}
        <Link href="/" className="font-semibold">
          책판
        </Link>

        {/* Middle menu */}
        <nav
          className="mx-6 flex flex-1 items-center gap-4 text-sm"
          aria-label="주요 메뉴"
        >
          {/* 탐색 메뉴는 나중에 노출 예정 */}
        </nav>

        {/* Right side: now purely client-rendered */}
        <AuthArea />
      </div>
    </header>
  );
}
