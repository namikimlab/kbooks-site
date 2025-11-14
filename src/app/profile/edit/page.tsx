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
  updated_at: string | null;
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
const HANDLE_MIN_LENGTH = 3;
const HANDLE_MAX_LENGTH = 20;
const NICKNAME_MIN_LENGTH = 2;
const NICKNAME_MAX_LENGTH = 20;
const LINK_MAX_LENGTH = 200;
const RESERVED_HANDLES = new Set([
  "admin",
  "root",
  "support",
  "bookpan",
  "api",
  "login",
  "signup",
  "profile",
  "users",
  "about",
  "contact",
  "settings",
  "lists",
]);
const RATE_LIMIT_MS = 5000;

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

  const handleRaw = handleInput ? String(handleInput).trim() : "";
  const nicknameRaw = nicknameInput ? String(nicknameInput).trim() : "";
  const bio = bioInput ? String(bioInput).trim() : "";

  if (!handleRaw || !nicknameRaw) {
    redirect(`/profile/edit?error=${encodeURIComponent("닉네임과 프로필 주소를 모두 입력해주세요.")}`);
  }

  const handle = handleRaw.toLowerCase();

  if (
    handle.length < HANDLE_MIN_LENGTH ||
    handle.length > HANDLE_MAX_LENGTH ||
    !/^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/.test(handle)
  ) {
    redirect(
      `/profile/edit?error=${encodeURIComponent(
        `프로필 주소는 ${HANDLE_MIN_LENGTH}~${HANDLE_MAX_LENGTH}자의 영문·숫자로 시작하고 끝나야 하며, 가운데에만 ., _, - 를 사용할 수 있어요.`
      )}`
    );
  }

  if (RESERVED_HANDLES.has(handle)) {
    redirect(
      `/profile/edit?error=${encodeURIComponent(
        "사용할 수 없는 프로필 주소예요. 다른 주소를 입력해 주세요."
      )}`
    );
  }

  const nickname = nicknameRaw.replace(/\s+/g, " ").trim();

  if (nickname.length < NICKNAME_MIN_LENGTH || nickname.length > NICKNAME_MAX_LENGTH) {
    redirect(
      `/profile/edit?error=${encodeURIComponent(
        `표시 이름은 ${NICKNAME_MIN_LENGTH}~${NICKNAME_MAX_LENGTH}자 이내로 입력해 주세요.`
      )}`
    );
  }

  if (!/^[\p{L}\p{N}\s._-]+$/u.test(nickname)) {
    redirect(
      `/profile/edit?error=${encodeURIComponent(
        "표시 이름에는 한글, 영문, 숫자, 공백, ., _, - 만 사용할 수 있어요."
      )}`
    );
  }

  const { data: conflictingHandle } = await supabase
    .from("user_profile")
    .select("id")
    .eq("handle", handle)
    .neq("id", user.id)
    .maybeSingle<{ id: string }>();

  if (conflictingHandle) {
    redirect(
      `/profile/edit?error=${encodeURIComponent(
        "이미 사용 중인 프로필 주소에요. 다른 주소를 입력해 주세요."
      )}`
    );
  }

  const normalizedBio = bio.length > 0 ? bio : null;
  let normalizedLinkUrl: string | null = null;
  if (linkUrlInput) {
    const linkCandidate = String(linkUrlInput).trim();
    if (linkCandidate.length > 0) {
      if (linkCandidate.length > LINK_MAX_LENGTH) {
        redirect(
          `/profile/edit?error=${encodeURIComponent(
            `링크는 ${LINK_MAX_LENGTH}자 이내로 입력해 주세요.`
          )}`
        );
      }
      try {
        const parsed = new URL(linkCandidate);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          redirect(
            `/profile/edit?error=${encodeURIComponent(
              "링크는 http:// 또는 https:// 로 시작해야 해요."
            )}`
          );
        }
        if (!parsed.hostname) {
          redirect(
            `/profile/edit?error=${encodeURIComponent(
              "유효한 웹사이트 주소를 입력해 주세요."
            )}`
          );
        }
        normalizedLinkUrl = parsed.toString();
      } catch {
        redirect(
          `/profile/edit?error=${encodeURIComponent(
            "유효한 웹사이트 주소를 입력해 주세요."
          )}`
        );
      }
    }
  }

  const { data: existingProfile } = await supabase
    .from("user_profile")
    .select("handle, avatar_url, updated_at")
    .eq("id", user.id)
    .maybeSingle<{ handle: string; avatar_url: string | null; updated_at: string | null }>();

  if (existingProfile?.updated_at) {
    const lastUpdated = Date.parse(existingProfile.updated_at);
    if (!Number.isNaN(lastUpdated) && Date.now() - lastUpdated < RATE_LIMIT_MS) {
      redirect(
        `/profile/edit?error=${encodeURIComponent(
          "프로필을 너무 자주 수정하고 있어요. 잠시 후 다시 시도해 주세요."
        )}`
      );
    }
  }

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
          "지원되지 않는 파일 형식이에요. JPEG, PNG, WEBP, GIF 중 하나를 선택해 주세요."
        )}`
      );
    }

    if (avatarFile.size > maxFileSize) {
      redirect(
        `/profile/edit?error=${encodeURIComponent(
          "이미지 크기가 1.5MB를 넘어요. 파일 크기를 줄이거나 더 작은 이미지를 다시 업로드해 주세요."
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
        redirect(
          `/profile/edit?error=${encodeURIComponent(
            "이미지를 저장하지 못했어요. 잠시 후 다시 시도해 주세요."
          )}`
        );
      }

      const { data: publicUrlData } = storage.storage.from(AVATAR_BUCKET).getPublicUrl(objectPath);
      resolvedAvatarUrl = publicUrlData.publicUrl;
    } catch (err) {
      console.error("[profile-edit] unexpected avatar upload error", err);
      redirect(
        `/profile/edit?error=${encodeURIComponent(
          "이미지를 업로드하는 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요."
        )}`
      );
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

  redirect(`/users/${handle}?profileUpdated=1`);
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
    .select("handle, nickname, bio, avatar_url, link_url, updated_at")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  if (profileError) {
    console.error("[profile-edit] failed to load profile", profileError);
  }

  const initialHandle = profile?.handle ? sanitizeText(profile.handle).toLowerCase() : "";
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
