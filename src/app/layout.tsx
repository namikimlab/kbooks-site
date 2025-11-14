import type { Metadata } from "next";
import "./globals.css";

import Header from "@/components/Header";
import SearchHeader from "@/components/SearchHeader";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "책판",
  description: "커뮤니티 추천 기반 도서 랭킹",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body
        suppressHydrationWarning
        className="antialiased min-h-screen bg-background text-foreground font-sans"
      >
        <Header /> 
        <SearchHeader />
        <main className="mx-auto max-w-6xl px-2 py-2">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
