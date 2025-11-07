import LikeButton from "@/components/LikeButton";
import BookReadButton from "@/components/BookReadButton";
import BookListButton from "@/components/BookListButton";

type BookActionButtonsProps = {
  isbn13: string;
};

export default function BookActionButtons({ isbn13 }: BookActionButtonsProps) {
  return (
    <div className="mt-4 flex w-full flex-wrap justify-center gap-3 md:justify-start">
      <LikeButton isbn13={isbn13} />
      <BookReadButton isbn13={isbn13} />

      <BookListButton isbn13={isbn13} />
    </div>
  );
}
