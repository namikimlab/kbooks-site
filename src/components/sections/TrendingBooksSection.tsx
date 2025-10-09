import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";

export default function TrendingBooksSection() {
  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">지금 뜨는 책</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            지금 누군가가 하트를 눌렀어요
          </p>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <ul className="flex gap-4">
          {[...Array(10)].map((_, i) => (
            <li key={i} className="w-32 flex-shrink-0">
              <Card className="overflow-hidden">
                <CardContent className="p-2">
                  <div className="relative aspect-[2/3] w-full rounded-md bg-muted">
                    <Image
                      src={`https://placehold.co/200x300?text=Book+${i + 1}`}
                      alt={`Book ${i + 1}`}
                      fill
                      className="object-cover rounded-md"
                    />
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
