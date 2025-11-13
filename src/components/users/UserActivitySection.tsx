type UserActivitySectionProps = {
  title?: string;
  description?: string;
};

export function UserActivitySection({
  title = "나의 활동",
  description = "활동 내역이 준비 중이에요. 곧 다양한 기록을 확인할 수 있어요.",
}: UserActivitySectionProps) {
  return (
    <section className="w-full">
      <div className="rounded-2xl border border-border/70 bg-background/60 p-6 text-left">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-muted-foreground">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </section>
  );
}
