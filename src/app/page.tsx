import DescriptionSection from "@/components/sections/DescriptionSection";
import FounderNoteSection from "@/components/sections/FounderNoteSection";

export default function HomePage() {
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      <DescriptionSection />
      <FounderNoteSection />
    </section>
  );
}
