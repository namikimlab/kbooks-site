"use client";

import { FormEvent, Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";

function AdminLoginContent() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nextPath = searchParams.get("next") || "/admin";
  const canSubmit = email.length > 0 && password.length >= 6 && !isSubmitting;

  const handleAdminLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    setStatus("관리자 계정을 확인하는 중이에요…");

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error("[admin-login] credentials failed", error);
        setStatus("이메일 또는 비밀번호가 올바르지 않아요.");
        setIsSubmitting(false);
        return;
      }

      setStatus("로그인에 성공했어요. 잠시 후 이동할게요.");
      router.replace(nextPath);
      router.refresh();
    } catch (err) {
      console.error("[admin-login] unexpected error", err);
      setStatus("알 수 없는 오류가 발생했어요. 잠시 후 다시 시도해 주세요.");
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center py-16">
      <div className="rounded-2xl border border-border/70 bg-card/70 p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-foreground">관리자 로그인</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          이메일과 비밀번호로 관리자 영역에 로그인하세요.
        </p>

        <form onSubmit={handleAdminLogin} className="mt-8 space-y-4">
          <div className="space-y-2">
            <label htmlFor="admin-email" className="text-sm font-medium text-foreground">
              이메일
            </label>
            <Input
              id="admin-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="admin-password" className="text-sm font-medium text-foreground">
              비밀번호
            </label>
            <Input
              id="admin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
            />
          </div>

          <Button type="submit" className="w-full" disabled={!canSubmit}>
            {isSubmitting ? "확인 중…" : "로그인"}
          </Button>
        </form>

        {status ? (
          <p className="mt-4 text-center text-sm text-muted-foreground">{status}</p>
        ) : null}
      </div>
    </section>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<section className="py-16 text-center text-sm text-muted-foreground">로그인 화면을 불러오는 중이에요…</section>}>
      <AdminLoginContent />
    </Suspense>
  );
}
