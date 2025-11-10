"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const HANDLE_MAX = 30;
const HANDLE_REGEX = /^[a-zA-Z0-9._]+$/;
const NICKNAME_MAX = 30;
const BIO_MAX = 150;
const LINK_MAX = 100;

type ProfileEditFormProps = {
  action: (formData: FormData) => Promise<void>;
  profileUrl: string;
  initials: string;
  initialHandle: string;
  initialNickname: string;
  initialBio: string;
  initialAvatarUrl: string | null;
  initialLinkUrl: string;
  errorMessage?: string;
};

export function ProfileEditForm({
  action,
  profileUrl,
  initials,
  initialHandle,
  initialNickname,
  initialBio,
  initialAvatarUrl,
  initialLinkUrl,
  errorMessage,
}: ProfileEditFormProps) {
  const [handle, setHandle] = useState(initialHandle);
  const [nickname, setNickname] = useState(initialNickname);
  const [bio, setBio] = useState(initialBio);
  const [linkUrl, setLinkUrl] = useState(initialLinkUrl);

  const handleError = useMemo(() => {
    if (!handle.trim()) return "핸들을 입력해주세요.";
    if (handle.length > HANDLE_MAX) return `핸들은 최대 ${HANDLE_MAX}자까지 작성할 수 있어요.`;
    if (!HANDLE_REGEX.test(handle)) return "영문, 숫자, 밑줄(_), 마침표(.)만 사용할 수 있어요.";
    return null;
  }, [handle]);

  const nicknameError = useMemo(() => {
    if (!nickname.trim()) return "표시 이름을 입력해주세요.";
    if (nickname.length > NICKNAME_MAX) return `표시 이름은 최대 ${NICKNAME_MAX}자까지 작성할 수 있어요.`;
    return null;
  }, [nickname]);

  const bioError = useMemo(() => {
    if (bio.length > BIO_MAX) return `소개는 최대 ${BIO_MAX}자까지 작성할 수 있어요.`;
    return null;
  }, [bio]);

  const linkError = useMemo(() => {
    if (!linkUrl) return null;
    if (linkUrl.length > LINK_MAX) return `웹사이트는 최대 ${LINK_MAX}자까지 입력할 수 있어요.`;
    if (!/^https?:\/\//i.test(linkUrl)) return "http:// 또는 https:// 로 시작해야 해요.";
    return null;
  }, [linkUrl]);

  const isFormValid = !handleError && !nicknameError && !bioError && !linkError;

  return (
    <div className="space-y-6 rounded-2xl border border-border/70 bg-background/80 p-6 shadow-sm">
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

      <form action={action} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="handle" className="block text-sm font-medium text-foreground">
            프로필 주소
          </label>
          <Input
            id="handle"
            name="handle"
            value={handle}
            onChange={event => setHandle(event.target.value)}
            required
            autoComplete="off"
            minLength={2}
            maxLength={HANDLE_MAX}
            placeholder="예: booklover"
            aria-invalid={Boolean(handleError)}
          />
          {handleError ? (
            <p className="text-xs text-destructive">{handleError}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="nickname" className="block text-sm font-medium text-foreground">
            표시 이름
          </label>
          <Input
            id="nickname"
            name="nickname"
            value={nickname}
            onChange={event => setNickname(event.target.value)}
            required
            maxLength={NICKNAME_MAX}
            placeholder="예: 김북덕"
            aria-invalid={Boolean(nicknameError)}
          />
          {nicknameError ? (
            <p className="text-xs text-destructive">{nicknameError}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="link_url" className="block text-sm font-medium text-foreground">
            내 웹사이트
          </label>
          <Input
            id="link_url"
            name="link_url"
            value={linkUrl}
            onChange={event => setLinkUrl(event.target.value)}
            type="url"
            placeholder="https://example.com"
            maxLength={LINK_MAX}
            aria-invalid={Boolean(linkError)}
          />
          <p className="text-xs text-muted-foreground">
            공개 프로필에 표시할 개인 웹사이트나 블로그 주소를 입력하세요. http:// 또는 https:// 로 시작해야 합니다.
          </p>
          {linkError ? (
            <p className="text-xs text-destructive">{linkError}</p>
          ) : null}
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
              <p>새 이미지를 업로드하면 자동으로 교체돼요.</p>
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
            value={bio}
            onChange={event => setBio(event.target.value)}
            rows={5}
            maxLength={BIO_MAX}
            className="text-sm focus-visible:ring-ring/50 focus-visible:border-ring focus-visible:ring-[3px] dark:bg-input/30 border-input w-full rounded-md border bg-transparent px-3 py-2 leading-relaxed outline-none ring-offset-background placeholder:text-muted-foreground"
            placeholder="간단한 소개를 작성해보세요."
            aria-invalid={Boolean(bioError)}
          />
          {bioError ? (
            <p className="text-xs text-destructive">{bioError}</p>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-3">
          <Link
            href={profileUrl}
            className="text-sm text-muted-foreground transition hover:text-foreground"
          >
            취소
          </Link>
          <Button type="submit" disabled={!isFormValid}>
            저장
          </Button>
        </div>
      </form>
    </div>
  );
}
