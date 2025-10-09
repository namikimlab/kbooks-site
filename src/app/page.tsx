import DescriptionSection from "@/components/sections/DescriptionSection";
import TrendingBooksSection from "@/components/sections/TrendingBooksSection";
import WeeklyRankingSection from "@/components/sections/WeeklyRankingSection";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      <DescriptionSection />
      <TrendingBooksSection />
      <WeeklyRankingSection />
      {/* Add more sections here */}
    </main>
  );
}
