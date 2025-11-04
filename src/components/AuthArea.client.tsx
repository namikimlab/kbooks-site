// components/AuthArea.client.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabaseClients";

export default function AuthArea() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
    });
  }, [supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.reload(); // refresh UI
  }

  return (
    <div className="ml-auto flex items-center gap-2">
      {userEmail ? (
        <>
          <span className="text-xs text-muted-foreground max-w-[140px] truncate">
            {userEmail}
          </span>
          <Button size="sm" variant="outline" onClick={handleLogout}>
            로그아웃
          </Button>
        </>
      ) : (
        <Link href="/login">
          <Button size="sm">로그인</Button>
        </Link>
      )}
    </div>
  );
}
