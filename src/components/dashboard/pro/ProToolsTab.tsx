import { TrendingUp, Briefcase } from "lucide-react";
import { ToolSectionHeader } from "@/components/dashboard/ToolSectionHeader";
import UpsellPanel from "@/components/pro/UpsellPanel";
import CompetitorPricingPanel from "@/components/pro/CompetitorPricingPanel";
import AIFollowUpPanel from "@/components/pro/AIFollowUpPanel";
import AutoReviewPanel from "@/components/pro/AutoReviewPanel";
import SkillBadgesPanel from "@/components/pro/SkillBadgesPanel";
import ReferralPanel from "@/components/pro/ReferralPanel";
import YardSignQRPanel from "@/components/pro/YardSignQRPanel";
import QuotesPanel from "@/components/pro/QuotesPanel";
import ServicePlansPanel from "@/components/pro/ServicePlansPanel";
import MileageLogPanel from "@/components/pro/MileageLogPanel";
import UpgradeGate from "@/components/dashboard/UpgradeGate";
import type { ProviderProfile } from "./types";

interface ProToolsTabProps {
  provider: ProviderProfile;
  userId: string;
  onGoToProfile: () => void;
}

const ProToolsTab = ({ provider, userId, onGoToProfile }: ProToolsTabProps) => {
  const hasAccess = provider.subscription_tier !== "free";
  return (
    <div className="space-y-10">
      <p className="text-xs text-muted-foreground -mt-1">
        Looking for your business info, service area, or app settings? Those live on the{" "}
        <button onClick={onGoToProfile} className="text-primary hover:underline font-medium">Profile</button> tab.
      </p>

      <div>
        <ToolSectionHeader icon={TrendingUp} title="Grow My Business" description="Marketing, leads, and AI tools that bring in more work." />
        <div className="grid lg:grid-cols-2 gap-5 mt-4 items-start">
          <UpsellPanel
            providerId={provider.id}
            providerCategory={provider.category}
            businessName={provider.business_name}
            userId={userId}
          />
          <UpgradeGate hasAccess={hasAccess} featureName="AI Competitor Pricing Intel" pricingRoute="/pro-pricing" description="See what other pros in your area charge before you quote." benefits={["Live low/median/high rates for your category", "Localized to your city & state"]}>
            <CompetitorPricingPanel
              category={provider.category}
              city={provider.city}
              state={provider.state}
              hourlyMin={provider.hourly_rate_min}
              hourlyMax={provider.hourly_rate_max}
            />
          </UpgradeGate>
          <UpgradeGate hasAccess={hasAccess} featureName="AI Follow-Up Drafts" pricingRoute="/pro-pricing" description="AI drafts a nudge for homeowners who went quiet — review and send in one tap.">
            <AIFollowUpPanel providerId={provider.id} userId={userId} businessName={provider.business_name} />
          </UpgradeGate>
          <UpgradeGate hasAccess={hasAccess} featureName="Auto-Request Reviews" pricingRoute="/pro-pricing" description="Automatically prompt happy customers for a review after every completed job.">
            <AutoReviewPanel providerId={provider.id} userId={userId} />
          </UpgradeGate>
          <SkillBadgesPanel providerId={provider.id} userId={userId} />
          <UpgradeGate hasAccess={hasAccess} featureName="Referral Program" pricingRoute="/pro-pricing" description="Get a shareable referral link and track signups from other pros.">
            <ReferralPanel providerId={provider.id} userId={userId} />
          </UpgradeGate>
          <div className="lg:col-span-2">
            <UpgradeGate hasAccess={hasAccess} featureName="Yard Sign QR Codes" pricingRoute="/pro-pricing" description="Generate a printable QR code linking straight to your profile.">
              <YardSignQRPanel
                providerSlug={provider.slug || null}
                providerId={provider.id}
                businessName={provider.business_name}
                category={provider.category}
                city={provider.city}
                state={provider.state}
              />
            </UpgradeGate>
          </div>
        </div>
      </div>

      <div>
        <ToolSectionHeader icon={Briefcase} title="Day-to-Day Work" description="Send quotes, manage recurring plans, and track mileage." />
        <div className="grid lg:grid-cols-2 gap-5 mt-4 items-start">
          <QuotesPanel
            providerId={provider.id}
            providerUserId={userId}
            businessName={provider.business_name}
          />
          <ServicePlansPanel providerId={provider.id} />
          <UpgradeGate hasAccess={hasAccess} featureName="Mileage Tracking" pricingRoute="/pro-pricing" description="Log trips and get a mileage/tax-deduction summary, with CSV export.">
            <MileageLogPanel providerId={provider.id} userId={userId} />
          </UpgradeGate>
        </div>
      </div>
    </div>
  );
};

export default ProToolsTab;
