export default function ContactPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold mb-4">문의하기</h1>
      <p>
        문의사항이 있으시면 아래 이메일로 연락해 주세요.<br />
        <a href="mailto:support@kbooks.co.kr" className="text-blue-600 hover:underline">
          support@kbooks.co.kr
        </a>
      </p>
    </main>
  );
}