export default function ContactPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold mb-4">문의하기</h1>
      <p>
        당신의 소중한 의견을 기다립니다.<br /> 그냥 인사도 대환영-!<br />
        <a href="mailto:contact@bookpan.kr" className="text-blue-600 hover:underline">
          contact@bookpan.kr
        </a>
      </p>
    </main>
  );
}