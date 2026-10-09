import { AsklyLogo } from "@/components/ui/logo-box";
import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen w-full bg-background">
      {/* Photo panel, the same scene as the landing hero */}
      <div className="relative hidden overflow-hidden lg:m-3 lg:flex lg:w-1/2 lg:flex-col lg:rounded-3xl">
        <Image
          src="/landing/hero-peak.webp"
          alt=""
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/55" />
        <div className="relative z-10 flex flex-1 flex-col p-10 text-white">
          <Link href="/landing" className="w-fit">
            <AsklyLogo markClassName="bg-white text-black" />
          </Link>
          <div className="flex-1" />
          <h2 className="max-w-md text-4xl font-semibold tracking-[-0.025em] leading-tight">
            Study smarter. Stress less.
          </h2>
          <p className="mt-3 max-w-md text-base text-white/80">
            Askly answers from your own course materials, keeps track of your
            deadlines, and turns your notes into quizzes and flashcards.
          </p>
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
