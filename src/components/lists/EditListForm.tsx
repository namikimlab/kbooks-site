"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ListVisibility = "public" | "private";

type EditListFormProps = {
  listId: string;
  detailHref: string;
  editHref: string;
  initialTitle: string;
  initialDescription: string | null;
  initialVisibility: ListVisibility;
};

type ApiError = Error & { status?: number };

const TITLE_CHAR_LIMIT = 30;
const DESCRIPTION_CHAR_LIMIT = 150;

export function EditListForm({
  listId,
  detailHref,
  editHref,
  initialTitle,
  initialDescription,
  initialVisibility,
}: EditListFormProps) {
  const router = useRouter();
  const [title, setTitle] = React.useState(initialTitle);
  const [description, setDescription] = React.useState(initialDescription ?? "");
  const [visibility, setVisibility] = React.useState<ListVisibility>(initialVisibility);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    setTitle(initialTitle);
  }, [initialTitle]);

  React.useEffect(() => {
    setDescription(initialDescription ?? "");
  }, [initialDescription]);

  React.useEffect(() => {
    setVisibility(initialVisibility);
  }, [initialVisibility]);

  const trimmedTitle = title.trim();
  const isSaveDisabled =
    trimmedTitle.length === 0 ||
    trimmedTitle.length > TITLE_CHAR_LIMIT ||
    description.length > DESCRIPTION_CHAR_LIMIT ||
    isSaving;

  const handleCancel = React.useCallback(() => {
    router.push(detailHref);
  }, [router, detailHref]);

  React.useEffect(() => {
    if (!toastMessage) return;
    const timeout = setTimeout(() => {
      setToastMessage(null);
      router.push(detailHref);
    }, 1200);
    return () => clearTimeout(timeout);
  }, [toastMessage, router, detailHref]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaveDisabled) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/user-lists/${listId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          title: trimmedTitle,
          description,
          visibility,
        }),
      });

      if (response.status === 401) {
        router.push(`/login?next=${encodeURIComponent(editHref)}`);
        return;
      }

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        const apiErr = new Error(payload.error || "리스트를 수정하지 못했어요.") as ApiError;
        apiErr.status = response.status;
        throw apiErr;
      }

      setToastMessage("리스트를 업데이트했어요!");
    } catch (err) {
      console.error("[edit-list] failed to update list", err);
      const apiError = err as ApiError;
      if (apiError?.status === 403) {
        setError("리스트를 수정할 권한이 없어요.");
      } else {
        setError(apiError?.message || "리스트를 수정하지 못했어요. 다시 시도해 주세요.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="space-y-6 rounded-2xl border border-border bg-card/80 p-6 shadow-sm">
      {toastMessage ? (
        <div
          role="status"
          aria-live="assertive"
          className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background"
        >
          {toastMessage}
        </div>
      ) : null}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="list-title" className="text-sm font-medium text-foreground">
            리스트 제목
          </label>
          <Input
            id="list-title"
            name="title"
            value={title}
            onChange={event => setTitle(event.target.value)}
            placeholder="나만의 추천 목록"
            className="h-12 text-lg font-medium placeholder:font-normal"
            aria-required="true"
            maxLength={TITLE_CHAR_LIMIT}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="list-description" className="text-sm font-medium text-foreground">
            설명 (선택)
          </label>
          <Textarea
            id="list-description"
            name="description"
            value={description}
            onChange={event => setDescription(event.target.value)}
            placeholder="리스트 소개를 입력하세요."
            maxLength={DESCRIPTION_CHAR_LIMIT}
          />
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-foreground">공개 여부</p>
          </div>
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="공개 여부 선택">
            {(
              [
                { value: "public", label: "공개" },
                { value: "private", label: "비공개" },
              ] as const
            ).map(option => (
              <button
                type="button"
                key={option.value}
                onClick={() => setVisibility(option.value)}
                className={cn(
                  "rounded-xl border px-4 py-3 text-center text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  visibility === option.value
                    ? "border-primary bg-primary/5 text-primary shadow-sm"
                    : "border-border bg-background text-muted-foreground hover:border-foreground/20"
                )}
                aria-pressed={visibility === option.value}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            공개하면 다른 사용자도 리스트를 볼 수 있어요.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <small className="text-sm text-muted-foreground">
            제목을 입력해야 저장할 수 있어요.
          </small>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button type="button" variant="ghost" onClick={handleCancel} disabled={isSaving}>
              취소
            </Button>
            <Button type="submit" disabled={isSaveDisabled}>
              {isSaving ? "저장 중..." : "저장"}
            </Button>
          </div>
        </div>

        <div aria-live="polite" className="min-h-[1.25rem] text-sm">
          {error ? <p className="text-destructive">{error}</p> : null}
        </div>
      </form>
    </section>
  );
}
