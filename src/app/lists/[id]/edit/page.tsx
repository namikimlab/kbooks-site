import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { EditListForm } from "@/components/lists/EditListForm";
import { createSupabaseServerClient } from "@/lib/supabaseServerClients";

export const dynamic = "force-dynamic";

type EditPageParams = Promise<{ id: string }>;

type ListRow = {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean | null;
  user_id: string;
};

export default async function EditListPage({ params }: { params: EditPageParams }) {
  const { id } = await params;

  if (!id) {
    notFound();
  }

  const editPath = `/lists/${id}/edit`;

  const supabase = await createSupabaseServerClient();
  const [{ data: list, error: listError }, authResult] = await Promise.all([
    supabase
      .from("user_lists")
      .select("id, title, description, is_public, user_id")
      .eq("id", id)
      .maybeSingle<ListRow>(),
    supabase.auth.getUser(),
  ]);

  if (listError) {
    console.error(`[list-edit] failed to fetch list id=${id}`, listError);
  }

  if (authResult.error) {
    console.error("[list-edit] failed to fetch auth user", authResult.error);
  }

  const user = authResult.data.user;
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(editPath)}`);
  }

  if (!list || list.user_id !== user.id) {
    notFound();
  }

  const initialVisibility = list.is_public === false ? "private" : "public";
  const detailHref = `/lists/${list.id}`;

  return (
    <section className="mx-auto max-w-2xl">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Link
          href={detailHref}
          className="inline-flex items-center gap-1 rounded-full border border-border/70 px-3 py-1 text-xs font-medium text-foreground transition hover:bg-muted"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          리스트로 돌아가기
        </Link>
        <span className="hidden text-xs text-border sm:inline">●</span>
        <span className="hidden text-xs text-muted-foreground sm:inline">리스트 편집</span>
      </div>

      <header className="space-y-2">
        <p className="text-sm text-muted-foreground">리스트 편집</p>
        <h1 className="text-3xl font-semibold leading-tight">{list.title}</h1>
        <p className="text-sm text-muted-foreground">
          제목, 설명, 공개 여부를 수정할 수 있어요.
        </p>
      </header>

      <EditListForm
        listId={list.id}
        detailHref={detailHref}
        editHref={editPath}
        initialTitle={list.title}
        initialDescription={list.description}
        initialVisibility={initialVisibility}
      />
    </section>
  );
}
