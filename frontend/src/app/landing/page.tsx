import Cta from "@/components/landing/cta";
import Faq from "@/components/landing/faq";
import Features from "@/components/landing/features";
import FeaturesCarousel from "@/components/landing/features-carousel";
import Footer from "@/components/landing/footer";
import Hero from "@/components/landing/hero";
import HowItWorks from "@/components/landing/how-it-works";
import Testimonials from "@/components/landing/testimonials";
import React from "react";
const Page = () => {
  return (
    <div>
      <Hero />
      <Features />

      <HowItWorks />
      <FeaturesCarousel />
      <Faq />
      <Testimonials />
      <Cta />
      <Footer />
    </div>
  );
};

export default Page;
