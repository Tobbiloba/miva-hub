import React from "react";
import Hero from "@/components/landing/hero";
import Features from "@/components/landing/features";
import FeaturesCarousel from "@/components/landing/features-carousel";
import HowItWorks from "@/components/landing/how-it-works";
import Faq from "@/components/landing/faq";
import Testimonials from "@/components/landing/testimonials";
import Cta from "@/components/landing/cta";
import Footer from "@/components/landing/footer";
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
