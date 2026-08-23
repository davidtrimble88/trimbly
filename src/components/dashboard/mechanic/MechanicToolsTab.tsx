import { TrendingUp, Briefcase } from "lucide-react";
import UpsellPanel from "@/components/pro/UpsellPanel";
import CompetitorPricingPanel from "@/components/pro/CompetitorPricingPanel";
import AIFollowUpPanel from "@/components/pro/AIFollowUpPanel";
import AutoReviewPanel from "@/components/pro/AutoReviewPanel";
import SkillBadgesPanel from "@/components/pro/SkillBadgesPanel";
import ReferralPanel from "@/components/pro/ReferralPanel";
import YardSignQRPanel from "@/components/pro/YardSignQRPanel";
import ServiceAreaPanel from "@/components/pro/ServiceAreaPanel";
import BusinessHoursPanel from "@/components/pro/BusinessHoursPanel";
import MileageLogPanel from "@/components/pro/MileageLogPanel";
import QuotesPanel from "@/components/pro/QuotesPanel";
import ServicePlansPanel from "@/components/pro/ServicePlansPanel";
import UpgradeGate from "@/components/dashboard/UpgradeGate";
import { ToolSectionHeader } from "@/components/dashboard/ToolSectionHeader";
import type { ProviderProfile } from "@/components/dashboard/pro/types";

interface MechanicToolsTabProps {
  provider: ProviderProfile;
  userId: string;
  onUpdated: (patch: Partial<ProviderProfile>) => void;
}

const MechanicToolsTab = ({ provider, userId, onUpdated }: MechanicToolsTabProps) => {
  const hasAccess = provider.subscription_tier !== "free";
  return (
    <div className="space-y-10">
      <div>
        <ToolSectionHeader icon={TrendingUp} title="Grow My Shop" description="Marketing, leads, and AI tools that bring in more work." />
        <div className="grid lg:grid-cols-2 gap-5 mt-4 items-start">
          <UpsellPanel
            providerId={provider.id}
            providerCategory={provider.category}
            businessName={provider.business_name}
            userId={userId}
            jobsTable="vehicle_jobs"
            ownerIdField="owner_user_id"
          />
          <UpgradeGate hasAccess={hasAccess} featureName="AI Competitor Pricing Intel" pricingRoute="/mechanic-pricing" description="See what other mechanics in your area charge before you quote." benefits={["Live low/median/high rates for your category", "Localized to your city & state"]}>
            <CompetitorPricingPanel
              category={provider.category}
              city={provider.city}
              state={provider.state}
              hourlyMin={provider.hourly_rate_min}
              hourlyMax={provider.hourly_rate_max}
            />
          </UpgradeGate>
          <UpgradeGate hasAccess={hasAccess} featureName="AI Follow-Up Drafts" pricingRoute="/mechanic-pricing" description="AI drafts a nudge for vehicle owners who went quiet — review and send in one tap.">
            <AIFollowUpPanel providerId={provider.id} userId={userId} businessName={provider.business_name} />
          </UpgradeGate>
          <UpgradeGate hasAccess={hasAccess} featureName="Auto-Request Reviews" pricingRoute="/mechanic-pricing" description="Automatically prompt happy customers for a review after every completed job.">
            <AutoReviewPanel providerId={provider.id} userId={userId} jobsTable="vehicle_jobs" ownerIdField="owner_user_id" />
          </UpgradeGate>
          <SkillBadgesPanel providerId={provider.id} userId={userId} jobsTable="vehicle_jobs" bidsTable="vehicle_job_bids" />
          <UpgradeGate hasAccess={hasAccess} featureName="Referral Program" pricingRoute="/mechanic-pricing" description="Get a shareable referral link and track signups from other mechanics.">
            <ReferralPanel providerId={provider.id} userId={userId} />
          </UpgradeGate>
          <div className="lg:col-span-2">
            <UpgradeGate hasAccess={hasAccess} featureName="Shop QR Codes" pricingRoute="/mechanic-pricing" description="Generate a printable QR code linking straight to your profile.">
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
        <ToolSectionHeader icon={Briefcase} title="Day-to-Day Work" description="Quotes, service plans, service area, hours, and mileage tracking." />
        <div className="grid lg:grid-cols-2 gap-5 mt-4 items-start">
          <QuotesPanel
            providerId={provider.id}
            providerUserId={userId}
            businessName={provider.business_name}
          />
          <ServicePlansPanel providerId={provider.id} />
          <UpgradeGate hasAccess={hasAccess} featureName="Service Area" pricingRoute="/mechanic-pricing" description="Set your service radius so the right vehicle owners find you.">
            <ServiceAreaPanel
              providerId={provider.id}
              city={provider.city}
              state={provider.state}
              initialRadius={provider.service_radius_miles}
              onUpdated={(r) => onUpdated({ service_radius_miles: r })}
            />
          </UpgradeGate>
          <UpgradeGate hasAccess={hasAccess} featureName="Business Hours" pricingRoute="/mechanic-pricing" description="Set your weekly hours so vehicle owners know when you're open.">
            <BusinessHoursPanel providerId={provider.id} initial={(provider as any).business_hours} />
          </UpgradeGate>
          <UpgradeGate hasAccess={hasAccess} featureName="Mileage Tracking" pricingRoute="/mechanic-pricing" description="Log trips and get a mileage/tax-deduction summary, with CSV export.">
            <MileageLogPanel providerId={provider.id} userId={userId} />
          </UpgradeGate>
        </div>
      </div>
    </div>
  );
};

export default MechanicToolsTab;
