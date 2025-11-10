import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabaseServerClients";
import { createSupabaseServiceRoleClient } from "@/lib/supabaseServiceRoleClient";
import { ProfileEditForm } from "@/components/profile/ProfileEditForm";

export const dynamic = "force-dynamic";

type ProfileRow = {
  handle: string;
  nickname: string;
  bio: string | null;
  avatar_url: string | null;
  link_url: string | null;
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
  const linkUrlInput = formData.get("link_url");

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
  let normalizedLinkUrl: string | null = null;
  if (linkUrlInput) {
    const linkCandidate = String(linkUrlInput).trim();
    if (linkCandidate.length > 0) {
      if (!/^https?:\/\//i.test(linkCandidate)) {
        redirect(
          `/profile/edit?error=${encodeURIComponent(
            "링크는 http:// 또는 https:// 로 시작해야 해요."
          )}`
        );
      }
      normalizedLinkUrl = linkCandidate;
    }
  }

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
        link_url: normalizedLinkUrl,
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
    .select("handle, nickname, bio, avatar_url, link_url")
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
  const initialLinkUrl = sanitizeText(profile?.link_url);

  const profileUrl = initialHandle ? `/users/${initialHandle}` : "/";
  const initials = buildInitials(initialNickname || user.email);

  return (
    <section className="mx-auto max-w-2xl">
      <ProfileEditForm
        action={upsertProfile}
        profileUrl={profileUrl}
        initials={initials}
        initialHandle={initialHandle}
        initialNickname={initialNickname}
        initialBio={initialBio}
        initialAvatarUrl={initialAvatarUrl}
        initialLinkUrl={initialLinkUrl}
        errorMessage={errorMessage}
      />
    </section>
  );
}
