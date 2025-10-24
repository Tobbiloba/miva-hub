import { Think } from "ui/think";
import { getTranslations } from "next-intl/server";
import { FlipWords } from "ui/flip-words";
import ShapeHero, { BackgroundPaths } from "ui/background-paths";
import ShimmerText from "./sign-in/_components/text";

export default async function AuthLayout({
  children,
}: { children: React.ReactNode }) {
  const t = await getTranslations("Auth.Intro");
  return (
    <main className="relative w-full flex flex-col h-screen">
      <div className="flex-1">
        <div className="flex min-h-screen w-full">
          <div className="hidden lg:flex lg:w-1/2 bg-muted border-r flex-col p-18 relative">
            <div className="absolute inset-0 w-full h-full">
              {/* <BackgroundPaths /> */}
              <ShapeHero />
            </div>
            {/* <h1 className="text-xl font-semibold flex items-center gap-3 animate-in fade-in duration-1000">
              <Think />

              <ShimmerText text="MIVA Hub"/>
            </h1> */}
            <div className="flex-1" />
            <FlipWords
              words={[t("description")]}
              className="text-base sm:text-lg text-black/40 dark:text-white/40 mb-8 leading-relaxed font-light tracking-wide max-w-2xl mx-auto px-4"
            />
          </div>

          <div className="w-full lg:w-1/2 p-6">{children}</div>
        </div>
      </div>
    </main>
  );
}
