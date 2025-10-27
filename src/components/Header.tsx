import Link from "next/link";
import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { Button } from "@/components/ui/button";

export default async function Header() {
  // Create a Supabase client that can read the user's auth session (from cookies)
  const supabase = createServerComponentClient({ cookies });

  // Ask Supabase who this request belongs to
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
        </nav>

        {/* Right side: Auth area */}
        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              {/* Show the logged-in email (fallback in case it's null) */}
              <span className="text-xs text-muted-foreground max-w-[140px] truncate">
                {user.email ?? "로그인됨"}
              </span>

              <form action="/logout" method="post">
                <Button size="sm" variant="outline" type="submit">
                  로그아웃
                </Button>
              </form>
            </>
          ) : (
            <Link href="/login">
              <Button size="sm">로그인</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
