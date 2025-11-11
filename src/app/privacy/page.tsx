export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 text-sm leading-relaxed text-muted-foreground">
      <h1 className="text-2xl font-semibold mb-6 text-foreground">
        개인정보 처리방침
      </h1>

      <p className="mb-6">
        책판(Bookpan.kr)은 이용자의 개인정보를 중요하게 생각하며 「개인정보 보호법」을 준수합니다.
        수집된 정보는 서비스 제공 목적 외에는 사용되지 않습니다.
      </p>

      <section className="mb-6">
        <h2 className="text-base font-medium mb-2 text-foreground">
          1. 수집하는 개인정보 항목
        </h2>
        <p>
          - 회원가입 시: 이메일 주소, 카카오 계정 정보(프로필명, 이메일)
          <br />
          - 서비스 이용 중 자동 수집: 접속기기 정보, 접속 IP, 이용기록
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-base font-medium mb-2 text-foreground">
          2. 개인정보의 이용 목적
        </h2>
        <p>
          - 회원 식별 및 로그인 관리
          <br />
          - 이용자 맞춤 서비스 제공
          <br />
          - 부정 이용 방지 및 서비스 보안 관리
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-base font-medium mb-2 text-foreground">
          3. 보유 및 이용 기간
        </h2>
        <p>
          - 회원 탈퇴 시 즉시 삭제
          <br />
          - 단, 관계 법령에 따라 일정 기간 보관이 필요한 경우 해당 법령에 따름
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-base font-medium mb-2 text-foreground">
          4. 개인정보의 제3자 제공 및 위탁
        </h2>
        <p>
          - 책판은 이용자의 동의 없이 개인정보를 외부에 제공하지 않습니다.
          <br />
          - 단, 로그인 및 인증을 위해 카카오(㈜카카오) 또는 유사한 제3자에 개인정보 처리를 위탁합니다.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-base font-medium mb-2 text-foreground">
          5. 개인정보 보호책임자
        </h2>
        <p>
          - 이름: 김남희
          <br />
          - 이메일: contact@bookpan.kr
        </p>
      </section>

      <section>
        <h2 className="text-base font-medium mb-2 text-foreground">
          6. 고지 및 변경
        </h2>
        <p>
          - 본 방침은 2025년 11월 12일부터 적용됩니다.
          <br />
          - 내용 변경 시 사이트에 안내합니다.
        </p>
      </section>
    </main>
  );
}
