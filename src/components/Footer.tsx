export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t">
      <div className="mx-auto max-w-6xl px-4 py-6 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-2">
        <div>© {year} 책판 (kbooks). All rights reserved.</div>
        <div className="flex gap-4">
          <a href="/about" className="hover:underline">
            소개
          </a>
          <a href="/privacy" className="hover:underline">
            개인정보처리방침
          </a>
          <a href="/contact" className="hover:underline">
            문의하기
          </a>
        </div>
      </div>
    </footer>
  );
}
