import DescriptionSection from "@/components/sections/DescriptionSection";
import MonthlyRankingSection from "@/components/sections/MonthlyRankingSection";
import RecentBooksSection from "@/components/sections/RecentBooksSection";
import WeeklyRankingSection from "@/components/sections/WeeklyRankingSection";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      <DescriptionSection />
      <RecentBooksSection />
      {/* Add more sections here */}
    </main>
  );
}
