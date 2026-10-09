import { cn } from "lib/utils";
import Image from "next/image";

/** Real Askly screens, captured at 2x in the dark theme (w/h in pixels). */
export const SHOTS = {
  answer: { src: "/landing/screens/answer.webp", w: 1696, h: 1384 },
  flashcards: { src: "/landing/screens/flashcards.webp", w: 1664, h: 1046 },
  quiz: { src: "/landing/screens/quiz.webp", w: 1664, h: 898 },
  home: { src: "/landing/screens/home.webp", w: 1824, h: 1206 },
  courses: { src: "/landing/screens/courses.webp", w: 2304, h: 1190 },
  deadlines: { src: "/landing/screens/deadlines.webp", w: 1664, h: 1084 },
  popup: { src: "/landing/screens/extension-popup.webp", w: 720, h: 770 },
} as const;

export type ShotName = keyof typeof SHOTS;

/**
 * A screen in a quiet frame: hairline border, soft blue glow behind, and
 * (with `bleed`) cut off at the bottom so it reads as part of the card.
 */
export function Shot({
  name,
  alt,
  bleed = false,
  className,
  sizes = "(min-width: 1024px) 560px, 100vw",
  priority = false,
}: {
  name: ShotName;
  alt: string;
  bleed?: boolean;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const shot = SHOTS[name];
  return (
    <div className={cn("relative", className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-8 -top-6 bottom-0 rounded-full bg-white/[0.06] blur-3xl"
      />
      <div
        className={cn(
          "relative overflow-hidden border border-white/10 bg-background shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)]",
          bleed ? "rounded-t-xl border-b-0" : "rounded-xl",
        )}
      >
        <Image
          src={shot.src}
          alt={alt}
          width={shot.w}
          height={shot.h}
          sizes={sizes}
          priority={priority}
          className="h-auto w-full"
        />
      </div>
    </div>
  );
}
