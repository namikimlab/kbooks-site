import Link from "next/link";
import { notFound } from "next/navigation";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createSupabaseServerClient } from "@/lib/supabaseServerClients";

export const dynamic = "force-dynamic";

type UserProfile = {
  id: string;
  handle: string;
  nickname: string;
  bio: string | null;
  avatar_url: string | null;
  link_url: string | null;
};

function initialsFromProfile(profile: UserProfile) {
  const source = profile.nickname?.trim() || profile.handle.trim();
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return "U";
  }
  if (words.length === 1) {
    return words[0]!.slice(0, 2).toUpperCase();
  }
  return (words[0]![0]! + words[words.length - 1]![0]!).toUpperCase();
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;

  if (!handle) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();

  const [{ data: profile, error: profileError }, userResult] = await Promise.all([
    supabase
      .from("user_profile")
      .select("id, handle, nickname, bio, avatar_url, link_url")
      .eq("handle", handle)
      .maybeSingle<UserProfile>(),
    supabase.auth.getUser(),
  ]);

  if (profileError) {
    console.error(`[user-profile] failed to fetch profile for handle=${handle}`, profileError);
  }

  if (!profile) {
    notFound();
  }

  const isOwner = userResult.data.user?.id === profile.id;
  const initials = initialsFromProfile(profile);
  const bio = profile.bio?.trim();

  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <div className="flex flex-col items-center gap-4 text-center">
        <Avatar className="size-28">
          {profile.avatar_url ? (
            <AvatarImage
              src={profile.avatar_url}
              alt={`${profile.nickname} 아바타`}
              className="object-cover"
            />
          ) : (
            <AvatarFallback className="text-3xl font-semibold uppercase">
              {initials}
            </AvatarFallback>
          )}
        </Avatar>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-foreground">{profile.nickname}</h1>
          {bio ? (
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {bio}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">아직 소개가 없어요.</p>
          )}
          <div className="text-sm">
            {profile.link_url ? (
              <a
                href={profile.link_url}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {profile.link_url}
              </a>
            ) : (
              <span className="text-muted-foreground">링크가 아직 없어요.</span>
            )}
          </div>
        </div>
        {isOwner ? (
          <div className="flex items-center gap-2">
            <Button asChild>
              <Link href="/profile/edit">프로필 편집</Link>
            </Button>
            <form action="/logout" method="post">
              <Button type="submit" variant="outline">
                로그아웃
              </Button>
            </form>
          </div>
        ) : null}
      </div>

      <div className="mt-12">
        <Tabs defaultValue="activity" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="activity">나의 활동</TabsTrigger>
            <TabsTrigger value="likes">좋아요</TabsTrigger>
            <TabsTrigger value="lists">리스트</TabsTrigger>
          </TabsList>
          <TabsContent value="activity">
            <div className="rounded-xl border border-border/70 bg-background/70 p-6 text-sm text-muted-foreground">
              활동 내역이 준비 중이에요. 곧 다양한 기록을 확인할 수 있어요.
            </div>
          </TabsContent>
          <TabsContent value="likes">
            <div className="rounded-xl border border-border/70 bg-background/70 p-6 text-sm text-muted-foreground">
              좋아요한 콘텐츠가 여기에 보여질 예정입니다.
            </div>
          </TabsContent>
          <TabsContent value="lists">
            <div className="rounded-xl border border-border/70 bg-background/70 p-6 text-sm text-muted-foreground">
              내가 만든 리스트가 곧 이곳에서 확인 가능해질 거예요.
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
