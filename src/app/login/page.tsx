"use client";

import { useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";

export default function LoginPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [status, setStatus] = useState<null | string>(null);
  const [email, setEmail] = useState("");
  const [isSendingLink, setIsSendingLink] = useState(false);
  const [isKakaoLoading, setIsKakaoLoading] = useState(false);

  const showEmailForm = false; // keep magic-link option for future use

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

  async function handleSendLink(e: React.FormEvent) {
    e.preventDefault();

    setIsSendingLink(true);
    setStatus("이메일을 보내는 중이에요…");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: buildRedirectUrl(),
      },
    });

    if (error) {
      console.error(error);
      setStatus("링크를 보내지 못했어요. 잠시 후 다시 시도해주세요.");
    } else {
      setStatus("메일함을 확인해서 로그인 링크를 눌러주세요.");
    }
    setIsSendingLink(false);
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

      {showEmailForm && (
        <div className="rounded-2xl border border-border/70 bg-card/50 p-6 shadow-sm">
          <h2 className="text-base font-semibold">이메일로 로그인</h2>
          <p className="mt-1 text-xs text-muted-foreground">원하신다면 이메일 링크 로그인도 사용 가능해요.</p>
          <form onSubmit={handleSendLink} className="mt-4 space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium">Email</label>
              <input
                type="email"
                required
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={isSendingLink}
              className="w-full rounded-md bg-black px-3 py-2 text-white text-sm font-medium disabled:opacity-80"
            >
              {isSendingLink ? "Sending…" : "Send magic link"}
            </button>
          </form>
        </div>
      )}

      {status && (
        <p className="text-sm text-center text-muted-foreground">{status}</p>
      )}
    </div>
  );
}
