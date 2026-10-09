import { AsklyLogo } from "@/components/ui/logo-box";
import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen w-full bg-background">
      {/* Showcase panel in the landing's black style, with the real app */}
      <div className="dark relative hidden overflow-hidden bg-background text-foreground lg:m-3 lg:flex lg:w-1/2 lg:flex-col lg:rounded-[20px] lg:border lg:border-white/10">
        <div className="relative z-10 flex flex-col p-10">
          <Link href="/landing" className="w-fit">
            <AsklyLogo markClassName="bg-white text-black" />
          </Link>
          <h2 className="mt-16 max-w-md text-4xl leading-tight font-semibold tracking-[-0.035em]">
            Your course, <span className="text-white/45">answered.</span>
          </h2>
          <p className="mt-3 max-w-md text-base text-muted-foreground">
            Askly answers from your own course materials, keeps track of your
            deadlines, and turns your notes into quizzes and flashcards.
          </p>
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 left-1/3 size-[420px] rounded-full bg-white/[0.07] blur-[110px]"
        />
        <div className="relative mt-auto ml-10 overflow-hidden rounded-tl-xl border-t border-l border-white/10">
          <Image
            src="/landing/screens/answer.webp"
            alt="Askly answering a question with sources from course notes"
            width={1696}
            height={1384}
            priority
            sizes="45vw"
            className="h-auto w-full"
          />
        </div>
      </div>

      <div className="flex w-full flex-col p-6 lg:w-1/2">
        <Link href="/landing" className="w-fit lg:hidden">
          <AsklyLogo />
        </Link>
        {children}
      </div>
    </main>
  );
}
