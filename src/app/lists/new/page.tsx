"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { MAX_BOOKS_PER_LIST } from "@/constants/lists";

type ListVisibility = "public" | "private";

type ApiError = Error & { status?: number };

async function createUserListRequest(payload: {
  title: string;
  description?: string;
  visibility: ListVisibility;
}) {
  const response = await fetch("/api/user-lists", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorMessage = "리스트를 만들지 못했어요.";
    try {
      const data = (await response.json()) as { error?: string };
      if (data?.error) {
        errorMessage = data.error;
      }
    } catch {
      // ignore JSON parsing issues
    }
    const error = new Error(errorMessage) as ApiError;
    error.status = response.status;
    throw error;
  }

  return (await response.json()) as { id: string };
}

export default function CreateListPage() {
  return (
    <React.Suspense fallback={<section className="mx-auto max-w-2xl py-10 text-sm text-muted-foreground">폼을 불러오는 중입니다…</section>}>
      <CreateListForm />
    </React.Suspense>
  );
}

function CreateListForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [visibility, setVisibility] = React.useState<ListVisibility>("public");
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  const currentPathWithQuery = React.useMemo(() => {
    const query = searchParams?.toString();
    return query && query.length > 0 ? `/lists/new?${query}` : "/lists/new";
  }, [searchParams]);

  const resolvedNextPath = React.useMemo(() => {
    const nextCandidate = searchParams?.get("next");
    if (!nextCandidate) return "/";
    return nextCandidate.startsWith("/") ? nextCandidate : "/";
  }, [searchParams]);

  const trimmedTitle = title.trim();
  const titleCharLimit = 30;
  const descriptionCharLimit = 150;
  const isSaveDisabled =
    trimmedTitle.length === 0 ||
    trimmedTitle.length > titleCharLimit ||
    description.length > descriptionCharLimit ||
    isSaving;

  const handleCancel = React.useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/");
  }, [router]);

  React.useEffect(() => {
    if (!toastMessage) return;
    const timeout = setTimeout(() => {
      setToastMessage(null);
      router.push(resolvedNextPath);
    }, 1400);
    return () => clearTimeout(timeout);
  }, [toastMessage, router, resolvedNextPath]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaveDisabled) return;

    setIsSaving(true);
    setError(null);

    try {
      await createUserListRequest({
        title: trimmedTitle,
        description: description.trim() || undefined,
        visibility,
      });
      setToastMessage("리스트가 만들어졌어요!");
    } catch (err) {
      console.error("[create-list] failed to save list", err);
      const apiError = err as ApiError;
      if (apiError?.status === 401) {
        router.push(`/login?next=${encodeURIComponent(currentPathWithQuery)}`);
        return;
      }
      setError(apiError?.message || "저장이 실패했어요. 다시 시도해주세요.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="mx-auto py-4 px-2 max-w-2xl">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold leading-tight">새 리스트 만들기</h1>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>좋아하는 책을 찾아 리스트에 더해보세요.</p>
          <p>최대 {MAX_BOOKS_PER_LIST}권까지 담을 수 있어요.</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="mt-6 space-y-8">
        <div className="space-y-6 rounded-2xl border border-border bg-card/80 p-6 shadow-sm">
          <div className="space-y-2">
            <label htmlFor="list-title" className="text-sm font-medium text-foreground">
              리스트 제목
            </label>
            <Input
              id="list-title"
              name="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="여름에 읽기 좋은 책들"
              className="h-12 text-lg font-medium placeholder:font-normal"
              aria-required="true"
              maxLength={titleCharLimit}
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
              placeholder="리스트에 대한 간단한 설명을 써주세요."
              maxLength={descriptionCharLimit}
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
              ).map((option) => (
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
              공개하면 다른 사용자도 볼 수 있어요.
            </p>
          </div>
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
          {error && <p className="text-destructive">저장이 실패했어요. 다시 시도해주세요.</p>}
        </div>
      </form>

      {toastMessage && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div
            role="status"
            aria-live="assertive"
            className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background shadow-lg"
          >
            {toastMessage}
          </div>
        </div>
      )}
    </section>
  );
}
