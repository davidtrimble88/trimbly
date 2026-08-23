import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Crown } from "lucide-react";
import ProGalleryEditor from "@/components/profile/ProGalleryEditor";
import BusinessHoursPanel from "@/components/pro/BusinessHoursPanel";
import PaymentMethodsPanel from "@/components/pro/PaymentMethodsPanel";
import ServiceAreaPanel from "@/components/pro/ServiceAreaPanel";
import ProFeaturesPanel from "@/components/pro/ProFeaturesPanel";
import NotificationPrefsPanel from "@/components/pro/NotificationPrefsPanel";
import InstallAppPanel from "@/components/pro/InstallAppPanel";
import AccountSettingsDialog from "@/components/AccountSettingsDialog";
import UpgradeGate from "@/components/dashboard/UpgradeGate";
import BusinessInfoCard from "./BusinessInfoCard";
import type { ProviderProfile } from "./types";
import { BETA_FREE_ACCESS, formatUsd, providerTiers } from "@/lib/pricingTiers";

const proTier = providerTiers.find((t) => t.key === "pro")!;

interface ProProfileTabProps {
  provider: ProviderProfile;
  userId: string;
  onEditProfile: () => void;
  onUpdated: (patch: Partial<ProviderProfile>) => void;
}

const ProProfileTab = ({ provider, userId, onEditProfile, onUpdated }: ProProfileTabProps) => {
  const navigate = useNavigate();
  const hasAccess = provider.subscription_tier !== "free";
  return (
    <div className="space-y-6">
      <ProGalleryEditor userId={userId} providerId={provider.id} businessName={provider.business_name} />

      <h2 className="text-lg font-bold text-foreground">Business Profile</h2>
      <BusinessInfoCard provider={provider} onEdit={onEditProfile} />

      <UpgradeGate hasAccess={hasAccess} featureName="Business Hours" pricingRoute="/pro-pricing" description="Set your weekly hours so homeowners know when you're open.">
        <BusinessHoursPanel providerId={provider.id} initial={(provider as any).business_hours} />
      </UpgradeGate>

      <PaymentMethodsPanel
        providerId={provider.id}
        initialMethods={provider.payment_methods}
        initialHandles={provider.payment_handles}
        onSaved={(methods, handles) => onUpdated({ payment_methods: methods, payment_handles: handles })}
      />

      <UpgradeGate hasAccess={hasAccess} featureName="Service Area" pricingRoute="/pro-pricing" description="Set your service radius so the right homeowners find you.">
        <ServiceAreaPanel
          providerId={provider.id}
          city={provider.city}
          state={provider.state}
          initialRadius={provider.service_radius_miles}
          onUpdated={(r) => onUpdated({ service_radius_miles: r })}
        />
      </UpgradeGate>

      <ProFeaturesPanel
        provider={provider}
        userId={userId}
        onUpdated={(patch) => onUpdated(patch)}
      />

      {provider.subscription_tier === "free" && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Crown size={20} className="text-primary" />
                  <h3 className="text-lg font-bold text-foreground">Upgrade to {proTier.name}</h3>
                  <Badge className="bg-primary text-primary-foreground text-xs">
                    {BETA_FREE_ACCESS ? "Free during beta" : `${formatUsd(proTier.monthlyUsd)}/mo`}
                  </Badge>
                </div>
                {BETA_FREE_ACCESS && (
                  <p className="text-xs text-muted-foreground mb-3">Regularly {formatUsd(proTier.monthlyUsd)}/mo — no payment needed while Trimbly is in beta.</p>
                )}
                <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-foreground">
                  {proTier.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-primary shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
              <Button size="lg" className="shrink-0 gap-1.5" onClick={() => navigate("/pro-pricing")}>
                <Crown size={16} /> Upgrade
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="pt-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Account & App</h2>
        <div className="space-y-6">
          <NotificationPrefsPanel userId={userId} />
          <InstallAppPanel />
          <Card>
            <CardContent className="p-5 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-sm font-medium text-foreground">Account settings</p>
                <p className="text-xs text-muted-foreground">Password, data export, and account deletion</p>
              </div>
              <AccountSettingsDialog trigger={<Button variant="outline" size="sm">Manage</Button>} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProProfileTab;
