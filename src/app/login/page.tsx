"use client";

import { useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";

export default function LoginPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [status, setStatus] = useState<null | string>(null);
  const [isKakaoLoading, setIsKakaoLoading] = useState(false);

  const buildRedirectUrl = () => {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (siteUrl && siteUrl.length > 0) {
      return `${siteUrl.replace(/\/$/, "")}/auth/callback`;
    }
    if (typeof window !== "undefined") {
      return `${window.location.origin}/auth/callback`;
    }
    return "/auth/callback";
  };

  async function handleKakaoLogin() {
    try {
      setIsKakaoLoading(true);
      setStatus("카카오 로그인 페이지로 이동 중이에요…");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "kakao",
        options: {
          redirectTo: buildRedirectUrl(),
        },
      });
      if (error) {
        console.error("[login] kakao auth failed", error);
        setStatus("카카오 로그인에 실패했어요. 잠시 후 다시 시도해주세요.");
        setIsKakaoLoading(false);
      }
    } catch (err) {
      console.error("[login] unexpected kakao error", err);
      setStatus("카카오 로그인에 실패했어요. 다시 시도해주세요.");
      setIsKakaoLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm py-16 space-y-6">
      <div className="rounded-2xl border border-border bg-card/80 p-6 shadow-sm">
        <h1 className="text-xl font-semibold">카카오로 로그인</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          카카오 계정으로 빠르게 시작할 수 있어요.
        </p>
        <button
          type="button"
          onClick={handleKakaoLogin}
          disabled={isKakaoLoading}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FEE500] px-4 py-3 text-sm font-semibold text-black shadow-sm transition hover:brightness-95 disabled:opacity-80"
        >
          {isKakaoLoading ? "연결 중…" : "카카오로 계속하기"}
        </button>
      </div>

      {status && (
        <p className="text-sm text-center text-muted-foreground">{status}</p>
      )}
    </div>
  );
}
