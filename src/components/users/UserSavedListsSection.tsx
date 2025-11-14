import { UserListsSection, type UserListSummary } from "@/components/users/UserListsSection";

type UserSavedListsSectionProps = {
  lists: UserListSummary[];
  profileNickname: string;
};

export function UserSavedListsSection({
  lists,
  profileNickname,
}: UserSavedListsSectionProps) {

  if (lists.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-6 py-12 text-center text-sm text-muted-foreground">
        아직 저장한 리스트가 없어요. 리스트 상세 페이지에서 하트를 눌러 저장해 보세요.
      </div>
    );
  }

  return <UserListsSection lists={lists} isOwner={false} profileNickname={profileNickname} />;
}
