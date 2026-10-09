import Cta from "@/components/landing/cta";
import Faq from "@/components/landing/faq";
import Features from "@/components/landing/features";
import FeaturesCarousel from "@/components/landing/features-carousel";
import Footer from "@/components/landing/footer";
import Hero from "@/components/landing/hero";
import HowItWorks from "@/components/landing/how-it-works";
import { Reveal } from "@/components/landing/reveal";
import Testimonials from "@/components/landing/testimonials";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Askly · Your AI study partner",
  description:
    "Askly answers from your own course materials with sources, turns lessons into quizzes and flashcards, and keeps your deadlines in one list. Capture lessons from the MIVA LMS with the Askly Capture Chrome extension.",
};

// The landing was designed on black: scope it to the dark theme so its
// translucent panels and white type read the way they were drawn.
const Page = () => {
  return (
    <div className="dark min-h-screen bg-background font-sans text-foreground antialiased">
      <Hero />
      <Features />
      <HowItWorks />
      <FeaturesCarousel />
      <Faq />
      <Testimonials />
      <Cta />
      <Footer />
      <Reveal />
    </div>
  );
};

export default Page;
