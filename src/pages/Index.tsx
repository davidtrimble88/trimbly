import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import HomeJourneySection from "@/components/landing/HomeJourneySection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import PricingSection from "@/components/landing/PricingSection";
import ForProsSection from "@/components/landing/ForProsSection";
import CTASection from "@/components/landing/CTASection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [loading, user, navigate]);

  return (
    <div className="trimbly-landing min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <HomeJourneySection />
        <FeaturesSection />
        <HowItWorksSection />
        <TestimonialsSection />
        <PricingSection />
        <ForProsSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
