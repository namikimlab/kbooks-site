import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google"; // ✅ use Korean font
import "./globals.css";

import Header from "@/components/Header";
import SearchHeader from "@/components/SearchHeader";
import Footer from "@/components/Footer";

const notoSans = Noto_Sans_KR({
  subsets: ["latin"], // latin + Korean supported
  weight: ["400", "500", "700"], // choose weights you’ll use
  variable: "--font-noto-sans-kr",
});

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
        className={`${notoSans.variable} antialiased min-h-screen bg-background text-foreground`}
      >
        <Header /> 
        <SearchHeader />
        <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
