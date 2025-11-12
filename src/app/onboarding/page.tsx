import { redirect } from "next/navigation";
import Image from "next/image";

import { createSupabaseServerClient } from "@/lib/supabaseServerClients";
import { createSupabaseServiceRoleClient } from "@/lib/supabaseServiceRoleClient";

export const dynamic = "force-dynamic";

const FALLBACK_AVATAR_URL = "/avatar-fallback.svg";

type SearchParams = Promise<{ error?: string }>;

function buildSuffix(userId: string) {
  return userId.replace(/[^a-zA-Z0-9]/g, "").slice(-4).toUpperCase();
}

function buildFallbackNickname(userId: string) {
  return `책읽는오리${buildSuffix(userId)}`;
}

function buildFallbackHandle(userId: string) {
  return `reader-${userId.replace(/[^a-z0-9]/gi, "").slice(-6).toLowerCase()}`;
}

async function completeOnboarding(formData: FormData) {
  "use server";

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/onboarding")}`);
  }

  const mode = String(formData.get("mode") ?? "default");
  const customNickname = String(formData.get("customNickname") ?? "").trim();

  const fallbackNickname = buildFallbackNickname(user.id);
  let nickname = fallbackNickname;
  if (mode === "custom") {
    if (customNickname.length < 2) {
      redirect(`/onboarding?error=${encodeURIComponent("닉네임은 최소 2자 이상 입력해주세요.")}`);
    }
    nickname = customNickname;
  }

  const handle = buildFallbackHandle(user.id);
  const serviceClient = createSupabaseServiceRoleClient();
  const { error } = await serviceClient
    .from("user_profile")
    .upsert(
      {
        id: user.id,
        handle,
        nickname,
        avatar_url: FALLBACK_AVATAR_URL,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "id" }
    );

  if (error) {
    console.error("[onboarding] failed to upsert profile", error);
    redirect(`/onboarding?error=${encodeURIComponent("프로필을 설정하지 못했어요.")}`);
  }

  redirect("/");
}

export default async function OnboardingPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/onboarding")}`);
  }

  const { data: existingProfile } = await supabase
    .from("user_profile")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (existingProfile) {
    redirect("/");
  }

  const fallbackNickname = buildFallbackNickname(user.id);
  const errorMessage = (await searchParams).error ?? null;

  return (
    <section className="mx-auto max-w-md space-y-6 py-16">
      <div className="text-center space-y-3">
        <h1 className="text-2xl font-semibold">프로필을 준비했어요</h1>
        <p className="text-sm text-muted-foreground">
          기본 닉네임으로 바로 시작하거나, 직접 원하는 닉네임을 정할 수 있어요.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card/70 p-6 shadow-sm space-y-4 text-center">
        <Image
          src={FALLBACK_AVATAR_URL}
          alt="기본 프로필 이미지"
          width={72}
          height={72}
          className="mx-auto rounded-full border border-border/70 bg-white p-2"
        />
        <p className="text-lg font-semibold">{fallbackNickname}</p>
        <form action={completeOnboarding}>
          <input type="hidden" name="mode" value="default" />
          <button
            type="submit"
            className="mt-4 inline-flex w-full justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            기본 닉네임으로 시작하기
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-6 shadow-sm space-y-4">
        <p className="font-medium">직접 닉네임을 정할래요</p>
        <form action={completeOnboarding} className="space-y-3">
          <input type="hidden" name="mode" value="custom" />
          <input
            type="text"
            name="customNickname"
            minLength={2}
            maxLength={24}
            placeholder="새 닉네임을 입력하세요"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            required
          />
          <button
            type="submit"
            className="inline-flex w-full justify-center rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
          >
            닉네임 저장
          </button>
        </form>
        <p className="text-xs text-muted-foreground">
          나중에 프로필 설정에서 언제든지 수정할 수 있어요.
        </p>
      </div>
      {errorMessage ? (
        <p className="text-center text-sm text-destructive">{errorMessage}</p>
      ) : null}
    </section>
  );
}
