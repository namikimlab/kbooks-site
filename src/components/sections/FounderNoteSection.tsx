"use client";

export function FounderNoteSection() {
  return (
    <section className="rounded-3xl border border-border/60 bg-card/80 px-4 py-6 shadow-sm space-y-5">
      <p className="text-base font-semibold text-foreground">안녕하세요</p>
      <p className="text-sm leading-relaxed text-muted-foreground">
        이 사이트는 제가 필요해서 똑딱똑딱 만들었어요 😀 
        좋은 책이 널리 알려졌으면 해서~ 베셀 리스트에 질려서. 좋은 책 리스트 정말 많잖아요? 서로서로 알려주고, 저장하고, 공유합시다!
      </p>
      <p className="text-sm leading-relaxed text-muted-foreground">
        마니마니 와서 같이 써주시면 감사. 마음에 들면 친구들에게 공유공유🧡 어디 안되는 부분 있으면{" "}
        <a href="mailto:contact@bookpan.kr" className="font-medium text-primary underline-offset-4 hover:underline">
          contact@bookpan.kr
        </a>{" "}
        로 알려주세요.
      </p>
      <p className="text-sm leading-relaxed text-muted-foreground">
        디자인, 코딩, 마케팅, 법률 등등 같이 하실 분들 대환영! 집에서 혼자해서 초큼 외로울때 있음- (그치만 그거슨 나의
        데스티니💫) 회사 이름은 <span className="font-medium text-foreground">하늘치 데이터 연구소</span> (영감 from 눈마새)예요.
        앞으로도 많이 만들 예정이니 응원 부탁드려요. 감사해요 ☺️
      </p>
      <div className="space-y-2 rounded-2xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">안 하는 것</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>팝업 (짱시룸. 특히 네비게이션에 뜰때.)</li>
          <li>이상한 광고 (제발 안 하고 싶다.)</li>
        </ul>
      </div>
      <div className="text-right text-sm text-muted-foreground">
        <p>그럼 모두 좋은 책과 행복한 밤 되라윳~😘</p>
        <p className="mt-1">2025.11.14 · 나미 드림</p>
      </div>
    </section>
  );
}

export default FounderNoteSection;
