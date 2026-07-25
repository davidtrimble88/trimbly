import { LucideIcon, TrendingUp, Briefcase } from "lucide-react";
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
import type { ProviderProfile } from "./types";

interface ProToolsTabProps {
  provider: ProviderProfile;
  userId: string;
  onGoToProfile: () => void;
}

const ToolSectionHeader = ({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) => (
  <div className="flex items-center gap-2 mb-1">
    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
      <Icon size={16} className="text-primary" />
    </div>
    <div>
      <h2 className="font-display text-lg font-semibold text-foreground leading-tight">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  </div>
);

const ProToolsTab = ({ provider, userId, onGoToProfile }: ProToolsTabProps) => {
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
          <CompetitorPricingPanel
            category={provider.category}
            city={provider.city}
            state={provider.state}
            hourlyMin={provider.hourly_rate_min}
            hourlyMax={provider.hourly_rate_max}
          />
          <AIFollowUpPanel providerId={provider.id} userId={userId} businessName={provider.business_name} />
          <AutoReviewPanel providerId={provider.id} userId={userId} />
          <SkillBadgesPanel providerId={provider.id} userId={userId} />
          <ReferralPanel providerId={provider.id} userId={userId} />
          <div className="lg:col-span-2">
            <YardSignQRPanel
              providerSlug={provider.slug || null}
              providerId={provider.id}
              businessName={provider.business_name}
              category={provider.category}
              city={provider.city}
              state={provider.state}
            />
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
          <MileageLogPanel providerId={provider.id} userId={userId} />
        </div>
      </div>
    </div>
  );
};

export default ProToolsTab;
