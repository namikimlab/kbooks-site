import type { Metadata } from "next";
import Script from "next/script";
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
  const GA_MEASUREMENT_ID = "G-W44924G8M6";

  return (
    <html lang="ko">
      <body
        suppressHydrationWarning
        className="antialiased min-h-screen bg-background text-foreground font-sans"
      >
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga-gtag" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
        <Header /> 
        <SearchHeader />
        <main className="mx-auto max-w-6xl px-2 py-2">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
