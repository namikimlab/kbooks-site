import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseServerClient } from "@/lib/supabaseServerClients";
import { createSupabaseServiceRoleClient } from "@/lib/supabaseServiceRoleClient";

export const dynamic = "force-dynamic";

type ProfileRow = {
  handle: string;
  nickname: string;
  bio: string | null;
  avatar_url: string | null;
};

type SearchParams = Promise<{ error?: string }>;

function sanitizeText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "";
}

function buildInitials(value: string | null | undefined) {
  const source = sanitizeText(value);
  if (!source) return "U";
  const pieces = source.split(/\s+/).filter(Boolean);
  if (pieces.length === 1) {
    return pieces[0]!.slice(0, 2).toUpperCase();
  }
  return (pieces[0]![0]! + pieces[pieces.length - 1]![0]!).toUpperCase();
}

const AVATAR_BUCKET = "profile-avatars";

async function upsertProfile(formData: FormData) {
  "use server";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/profile/edit")}`);
  }

  const handleInput = formData.get("handle");
  const nicknameInput = formData.get("nickname");
  const bioInput = formData.get("bio");
  const avatarRemove = formData.get("avatar_remove") === "1";
  const avatarFile = formData.get("avatar_file");

  const handle = handleInput ? String(handleInput).trim() : "";
  const nickname = nicknameInput ? String(nicknameInput).trim() : "";
  const bio = bioInput ? String(bioInput).trim() : "";

  if (!handle || !nickname) {
    redirect(`/profile/edit?error=${encodeURIComponent("닉네임과 핸들을 모두 입력해주세요.")}`);
  }

  if (!/^[a-z0-9._-]+$/i.test(handle)) {
    redirect(
      `/profile/edit?error=${encodeURIComponent(
        "핸들은 영문, 숫자, 점(.), 밑줄(_), 하이픈(-)만 사용할 수 있어요."
      )}`
    );
  }

  const normalizedBio = bio.length > 0 ? bio : null;

  const { data: existingProfile } = await supabase
    .from("user_profile")
    .select("handle, avatar_url")
    .eq("id", user.id)
    .maybeSingle<{ handle: string; avatar_url: string | null }>();

  let resolvedAvatarUrl = existingProfile?.avatar_url ?? null;

  if (avatarRemove) {
    resolvedAvatarUrl = null;
  }

  if (avatarFile instanceof File && avatarFile.size > 0) {
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const maxFileSize = 1.5 * 1024 * 1024; // 1.5MB

    if (!allowedMimeTypes.includes(avatarFile.type)) {
      redirect(
        `/profile/edit?error=${encodeURIComponent(
          "JPEG, PNG, WEBP, GIF 형식의 이미지 파일만 업로드할 수 있어요."
        )}`
      );
    }

    if (avatarFile.size > maxFileSize) {
      redirect(
        `/profile/edit?error=${encodeURIComponent(
          "이미지 크기는 최대 1.5MB까지 지원해요. 파일 크기를 줄인 후 다시 시도해주세요."
        )}`
      );
    }

    try {
      const bytes = new Uint8Array(await avatarFile.arrayBuffer());
      const typeExt = avatarFile.type.includes("/")
        ? avatarFile.type.split("/")[1]?.toLowerCase()
        : undefined;
      const extensionMatch = avatarFile.name.match(/\.([a-zA-Z0-9]+)$/);
      const ext = (typeExt || extensionMatch?.[1] || "png").toLowerCase();

      const objectPath = `${user.id}.${ext}`;
      const storage = createSupabaseServiceRoleClient();
      const { error: uploadError } = await storage.storage
        .from(AVATAR_BUCKET)
        .upload(objectPath, bytes, {
          contentType: avatarFile.type || "image/png",
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        console.error("[profile-edit] avatar upload failed", uploadError);
        redirect(`/profile/edit?error=${encodeURIComponent("이미지 업로드에 실패했어요. 다시 시도해주세요.")}`);
      }

      const { data: publicUrlData } = storage.storage.from(AVATAR_BUCKET).getPublicUrl(objectPath);
      resolvedAvatarUrl = publicUrlData.publicUrl;
    } catch (err) {
      console.error("[profile-edit] unexpected avatar upload error", err);
      redirect(`/profile/edit?error=${encodeURIComponent("이미지 업로드 중 문제가 발생했어요.")}`);
    }
  }

  const { error } = await supabase
    .from("user_profile")
    .upsert(
      {
        id: user.id,
        handle,
        nickname,
        bio: normalizedBio,
        avatar_url: resolvedAvatarUrl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

  if (error) {
    console.error("[profile-edit] failed to upsert profile", error);
    redirect(`/profile/edit?error=${encodeURIComponent("프로필을 저장하지 못했어요. 다시 시도해주세요.")}`);
  }

  await revalidatePath(`/users/${handle}`);
  if (existingProfile?.handle && existingProfile.handle !== handle) {
    await revalidatePath(`/users/${existingProfile.handle}`);
  }

  redirect(`/users/${handle}`);
}

export default async function ProfileEditPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error: errorMessage } = await searchParams;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/profile/edit")}`);
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profile")
    .select("handle, nickname, bio, avatar_url")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  if (profileError) {
    console.error("[profile-edit] failed to load profile", profileError);
  }

  const initialHandle = profile?.handle ? sanitizeText(profile.handle) : "";
  const initialNickname =
    sanitizeText(profile?.nickname) ||
    sanitizeText((user.user_metadata?.full_name as string | undefined) ?? null) ||
    sanitizeText(user.email);
  const initialBio = sanitizeText(profile?.bio);
  const initialAvatarUrl = sanitizeText(profile?.avatar_url);

  const profileUrl = initialHandle ? `/users/${initialHandle}` : "/";
  const initials = buildInitials(initialNickname || user.email);

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-2xl flex-col justify-center px-6 py-16">
      <div className="space-y-6 rounded-2xl border border-border/70 bg-background/80 p-8 shadow-sm">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">프로필 편집</h1>
          <p className="text-sm text-muted-foreground">
            공개 프로필에 보여지는 정보를 수정할 수 있어요.
          </p>
        </div>

        {errorMessage ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : null}

        <form
          action={upsertProfile}
          className="space-y-6"
          encType="multipart/form-data"
        >
          <div className="space-y-2">
            <label htmlFor="handle" className="block text-sm font-medium text-foreground">
              프로필 주소 (handle)
            </label>
            <Input
              id="handle"
              name="handle"
              defaultValue={initialHandle}
              required
              autoComplete="off"
              minLength={2}
              maxLength={32}
              placeholder="예: booklover"
            />
            <p className="text-xs text-muted-foreground">
              {`당신의 프로필은 `}
              <span className="font-mono text-foreground">{`/users/{handle}`}</span>
              {` 경로로 공유돼요.`}
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="nickname" className="block text-sm font-medium text-foreground">
              표시 이름
            </label>
            <Input
              id="nickname"
              name="nickname"
              defaultValue={initialNickname}
              required
              placeholder="예: 김북덕"
            />
          </div>

          <div className="space-y-2">
            <span className="block text-sm font-medium text-foreground">프로필 이미지</span>
            <div className="flex items-center gap-4">
              <Avatar className="size-16 border border-border">
                {initialAvatarUrl ? (
                  <AvatarImage src={initialAvatarUrl} alt="현재 프로필 이미지" className="object-cover" />
                ) : (
                  <AvatarFallback className="text-base font-semibold uppercase">{initials}</AvatarFallback>
                )}
              </Avatar>
              <div className="space-y-2 text-sm text-muted-foreground">
                <label className="block">
                  <span className="sr-only">새 아바타 업로드</span>
                  <Input id="avatar_file" name="avatar_file" type="file" accept="image/*" />
                </label>
                <p>새 이미지를 업로드하면 자동으로 교체돼요. 비워두면 기존 이미지를 유지합니다.</p>
                {initialAvatarUrl ? (
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" name="avatar_remove" value="1" />
                    <span>현재 이미지를 제거할게요.</span>
                  </label>
                ) : null}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="bio" className="block text-sm font-medium text-foreground">
              소개
            </label>
            <textarea
              id="bio"
              name="bio"
              defaultValue={initialBio}
              rows={5}
              className="text-sm focus-visible:ring-ring/50 focus-visible:border-ring focus-visible:ring-[3px] dark:bg-input/30 border-input w-full rounded-md border bg-transparent px-3 py-2 leading-relaxed outline-none ring-offset-background placeholder:text-muted-foreground"
              placeholder="간단한 소개를 작성해보세요."
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            <Link
              href={profileUrl}
              className="text-sm text-muted-foreground transition hover:text-foreground"
            >
              취소
            </Link>
            <Button type="submit">저장</Button>
          </div>
        </form>
      </div>
    </section>
  );
}
