export default function NotFound() {
  return (
    <main className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6">
      <h1 className="text-3xl font-semibold tracking-tight">페이지를 찾을 수 없어요</h1>

      <p className="mt-3 text-sm text-muted-foreground max-w-prose">
        문제가 지속되면 알려주세요
      </p>

      <a
        href="/"
        className="mt-6 inline-flex items-center rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
      >
        ← 돌아가기
      </a>
    </main>
  );
}
