import { AppearanceSection } from "@/components/landing/appearance-section";
import { ClosingSection } from "@/components/landing/closing-section";
import { ExploreSection } from "@/components/landing/explore-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { HeroSection } from "@/components/landing/hero-section";
import { QuestionsSection } from "@/components/landing/questions-section";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Askly · Your AI study partner",
  description:
    "Askly answers from your own course materials, keeps track of your deadlines, and turns lectures into quizzes and flashcards. Join the waitlist.",
};

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#e9ecef] font-sans text-neutral-900">
      <HeroSection />
      <FeaturesSection />
      <AppearanceSection />
      <ExploreSection />
      <QuestionsSection />
      <ClosingSection />
    </main>
  );
}
