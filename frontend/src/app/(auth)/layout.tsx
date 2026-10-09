import { AsklyLogo } from "@/components/ui/logo-box";
import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen w-full bg-background">
      {/* Showcase panel in the landing's black style, with the real app */}
      <div className="dark relative hidden overflow-hidden bg-black text-white lg:m-3 lg:flex lg:w-1/2 lg:flex-col lg:rounded">
        <div className="relative z-10 flex flex-col p-10">
          <Link href="/landing" className="w-fit">
            <AsklyLogo markClassName="bg-white text-black" />
          </Link>
          <h2 className="mt-16 max-w-md text-4xl leading-tight font-normal tracking-[-0.025em]">
            Your course, answered.
          </h2>
          <p className="mt-3 max-w-md text-base text-neutral-400">
            Askly answers from your own course materials, keeps track of your
            deadlines, and turns your notes into quizzes and flashcards.
          </p>
        </div>
        <div className="relative mt-auto ml-10 h-[45%] overflow-hidden rounded-tl border-t border-l border-neutral-800">
          <Image
            src="/landing/screens/answer-dark.webp"
            alt="Askly answering a question with sources from course notes"
            fill
            priority
            sizes="50vw"
            className="object-cover object-left-top"
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
