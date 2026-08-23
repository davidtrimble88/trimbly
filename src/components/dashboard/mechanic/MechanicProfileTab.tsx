import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Crown } from "lucide-react";
import ProGalleryEditor from "@/components/profile/ProGalleryEditor";
import ProFeaturesPanel from "@/components/pro/ProFeaturesPanel";
import NotificationPrefsPanel from "@/components/pro/NotificationPrefsPanel";
import InstallAppPanel from "@/components/pro/InstallAppPanel";
import AccountSettingsDialog from "@/components/AccountSettingsDialog";
import BusinessInfoCard from "@/components/dashboard/pro/BusinessInfoCard";
import type { ProviderProfile } from "@/components/dashboard/pro/types";
import { BETA_FREE_ACCESS, formatUsd, mechanicTiers } from "@/lib/pricingTiers";

const mechanicProTier = mechanicTiers.find((t) => t.key === "pro")!;

interface MechanicProfileTabProps {
  provider: ProviderProfile;
  userId: string;
  onEditProfile: () => void;
  onUpdated: (patch: Partial<ProviderProfile>) => void;
}

const MechanicProfileTab = ({ provider, userId, onEditProfile, onUpdated }: MechanicProfileTabProps) => {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <ProGalleryEditor userId={userId} providerId={provider.id} businessName={provider.business_name} />

      <h2 className="text-lg font-bold text-foreground">Shop Profile</h2>
      <BusinessInfoCard provider={provider} onEdit={onEditProfile} />

      <ProFeaturesPanel
        provider={provider}
        userId={userId}
        onUpdated={(patch) => onUpdated(patch)}
        jobsTable="vehicle_jobs"
        bidsTable="vehicle_job_bids"
        ownerIdField="owner_user_id"
      />

      {provider.subscription_tier === "free" && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Crown size={20} className="text-primary" />
                  <h3 className="text-lg font-bold text-foreground">Upgrade to {mechanicProTier.name}</h3>
                  <Badge className="bg-primary text-primary-foreground text-xs">
                    {BETA_FREE_ACCESS ? "Free during beta" : `${formatUsd(mechanicProTier.monthlyUsd)}/mo`}
                  </Badge>
                </div>
                {BETA_FREE_ACCESS && (
                  <p className="text-xs text-muted-foreground mb-3">Regularly {formatUsd(mechanicProTier.monthlyUsd)}/mo — no payment needed while Trimbly is in beta.</p>
                )}
                <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-foreground">
                  {mechanicProTier.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-primary shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
              <Button size="lg" className="shrink-0 gap-1.5" onClick={() => navigate("/mechanic-pricing")}>
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

export default MechanicProfileTab;
