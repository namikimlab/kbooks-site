export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t">
      <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-muted-foreground">
        © {year} 책판 (kbooks). All rights reserved.
      </div>
    </footer>
  );
}