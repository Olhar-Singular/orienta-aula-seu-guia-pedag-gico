import LandingHeader from "@/components/landing/LandingHeader";
import HeroSection from "@/components/landing/HeroSection";
import PeiSection from "@/components/landing/PeiSection";
import PainPointsSection from "@/components/landing/PainPointsSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import BenefitsSection from "@/components/landing/BenefitsSection";
import FaqSection from "@/components/landing/FaqSection";
import SocialProofSection from "@/components/landing/SocialProofSection";
import CtaSection from "@/components/landing/CtaSection";
import LandingFooter from "@/components/landing/LandingFooter";

export default function Index() {
  return (
    <div className="min-h-screen bg-background" id="main-content">
      <LandingHeader />
      <HeroSection />
      <PeiSection />
      <PainPointsSection />
      <HowItWorksSection />
      <BenefitsSection />
      <FaqSection />
      <SocialProofSection />
      <CtaSection />
      <LandingFooter />
    </div>
  );
}
