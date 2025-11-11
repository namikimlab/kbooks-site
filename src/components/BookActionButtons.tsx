import LikeButton from "@/components/LikeButton";
import BookReadButton from "@/components/BookReadButton";
import BookListButton from "@/components/BookListButton";
import { cn } from "@/lib/utils";

type BookActionButtonsProps = {
  isbn13: string;
  kyoboUrl?: string | null;
};

export default function BookActionButtons({ isbn13, kyoboUrl }: BookActionButtonsProps) {
  const buttonClass = "h-11 justify-center w-full rounded-full text-xs";
  const gridClass = "grid w-full gap-2 grid-cols-2 md:grid-cols-4";
  const baseBuyClass =
    "inline-flex items-center justify-center gap-2 rounded-full px-3 py-2 text-xs font-medium transition";

  return (
    <div className={cn("mt-6 w-full", gridClass)}>
      <LikeButton isbn13={isbn13} className={buttonClass} />
      <BookReadButton isbn13={isbn13} className={buttonClass} />
      <BookListButton isbn13={isbn13} className={buttonClass} />
      {kyoboUrl ? (
        <a
          href={kyoboUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            baseBuyClass,
            "bg-primary text-primary-foreground hover:bg-primary/90",
            buttonClass
          )}
        >
          구매하기
        </a>
      ) : (
        <button
          type="button"
          disabled
          className={cn(
            baseBuyClass,
            "border border-border bg-muted text-muted-foreground opacity-70",
            buttonClass
          )}
        >
          구매하기
        </button>
      )}
    </div>
  );
}
