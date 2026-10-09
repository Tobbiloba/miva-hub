import { cn } from "lib/utils";
import Image from "next/image";

/** A phone bezel around a real app screenshot (390×844 captures). */
export function PhoneFrame({
  src,
  alt,
  className,
  priority,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative aspect-[390/844] w-full overflow-hidden rounded-[2.2rem] border-[7px] border-neutral-900 bg-neutral-900 shadow-2xl",
        className,
      )}
    >
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes="(min-width: 1024px) 280px, 45vw"
        className="rounded-[1.7rem] object-cover object-top"
      />
    </div>
  );
}

/** A minimal laptop/browser window around a desktop screenshot (1440×900). */
export function DesktopFrame({
  src,
  alt,
  className,
  priority,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-black/10 bg-white shadow-2xl",
        className,
      )}
    >
      <div className="flex h-7 items-center gap-1.5 border-b border-black/5 bg-neutral-100 px-3">
        <span className="size-2.5 rounded-full bg-[#ff5f57]" />
        <span className="size-2.5 rounded-full bg-[#febc2e]" />
        <span className="size-2.5 rounded-full bg-[#28c840]" />
      </div>
      <div className="relative aspect-[1440/900] w-full">
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes="(min-width: 1024px) 900px, 95vw"
          className="object-cover object-top"
        />
      </div>
    </div>
  );
}
