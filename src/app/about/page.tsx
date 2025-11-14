import FounderNoteSection from "@/components/sections/FounderNoteSection";

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 text-sm leading-relaxed text-muted-foreground space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">소개</h1>
      <FounderNoteSection />
      <hr className="border-border/70" />

      <p>
        정말 좋은 책인데, 아무도 몰라서 속상했던 적 있으시죠? <br />
        “이건 꼭 읽어야 해!” 하고 외치고 싶을 때도 있잖아요.
      </p>

      <p>
        베스트셀러도 좋지만, 비슷한 책만 계속 보면 조금 지칠 때도 있죠.
      </p>

      <p className="text-base font-semibold text-foreground text-center">
        책판에서 인생책을 함께 나눠요.
      </p>

      <p>
        좋은 책이 더 멀리, 꼭 필요한 사람에게 닿을 수 있도록 도와주세요.
      </p>

      <p>
        기술로 우리의 삶이 조금 더 나아지길 바라며, <br />
        <span className="font-medium text-foreground">
          하늘치 데이터 연구소 드림.
        </span>
      </p>
    </main>
  );
}
