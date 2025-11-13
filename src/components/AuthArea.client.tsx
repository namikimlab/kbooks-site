// components/AuthArea.client.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";

type ProfileRow = {
  handle: string;
  nickname: string;
  avatar_url: string | null;
};

function buildInitials(src: string | null | undefined) {
  if (!src) return "U";
  const cleaned = src.trim();
  if (!cleaned) return "U";
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export default function AuthArea() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  useEffect(() => {
    let isMounted = true;

    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!isMounted) return;
        setUser(data.user ?? null);
      })
      .catch(err => {
        console.error("[auth-area] failed to fetch user", err);
        if (isMounted) setUser(null);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }

    let cancelled = false;

    async function loadProfile(currentUser: User) {
      try {
        const { data, error } = await supabase
          .from("user_profile")
          .select("handle, nickname, avatar_url")
          .eq("id", currentUser.id)
          .maybeSingle<ProfileRow>();

        if (error) {
          console.error("[auth-area] failed to fetch profile", error);
        }
        if (!cancelled) {
          setProfile(data ?? null);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("[auth-area] unexpected profile fetch error", err);
          setProfile(null);
        }
      }
    }

    void loadProfile(user);

    return () => {
      cancelled = true;
    };
  }, [supabase, user]);

  if (user === undefined) {
    return <div className="ml-auto h-9 w-9" />;
  }

  const isLoggedIn = !!user;
  const profileUrl = profile?.handle ? `/users/${profile.handle}` : "/profile/edit";
  const initials = buildInitials(profile?.nickname ?? user?.email ?? null);

  return (
    <div className="ml-auto flex items-center gap-2">
      {isLoggedIn ? (
        <>
          <Link
            href={profileUrl}
            aria-label="내 프로필로 이동"
            className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <Avatar className="size-9 border border-border bg-background transition hover:opacity-90">
              {profile?.avatar_url ? (
                <AvatarImage
                  src={profile.avatar_url}
                  alt={`${profile.nickname ?? "내"} 프로필 이미지`}
                  className="object-cover"
                />
              ) : (
                <AvatarFallback className="text-sm font-medium uppercase">
                  {initials}
                </AvatarFallback>
              )}
            </Avatar>
          </Link>
          <Link href={profileUrl}>
            <Button size="sm" variant="outline">
              내 책장
            </Button>
          </Link>
        </>
      ) : (
        <Link href="/login">
          <Button size="sm">로그인</Button>
        </Link>
      )}
    </div>
  );
}
