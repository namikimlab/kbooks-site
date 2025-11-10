import { notFound, redirect } from "next/navigation";

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
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold leading-tight">리스트 편집</h1>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>제목, 설명, 공개 여부를 수정할 수 있어요.</p>
        </div>
      </header>

      <div className="mt-6">
        <EditListForm
          listId={list.id}
          detailHref={detailHref}
          editHref={editPath}
          initialTitle={list.title}
          initialDescription={list.description}
          initialVisibility={initialVisibility}
        />
      </div>
    </section>
  );
}
