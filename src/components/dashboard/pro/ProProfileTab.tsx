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
import BusinessInfoCard from "./BusinessInfoCard";
import type { ProviderProfile } from "./types";

interface ProProfileTabProps {
  provider: ProviderProfile;
  userId: string;
  onEditProfile: () => void;
  onUpdated: (patch: Partial<ProviderProfile>) => void;
}

const ProProfileTab = ({ provider, userId, onEditProfile, onUpdated }: ProProfileTabProps) => {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <ProGalleryEditor userId={userId} providerId={provider.id} businessName={provider.business_name} />

      <h2 className="text-lg font-bold text-foreground">Business Profile</h2>
      <BusinessInfoCard provider={provider} onEdit={onEditProfile} />

      <BusinessHoursPanel providerId={provider.id} initial={(provider as any).business_hours} />

      <PaymentMethodsPanel
        providerId={provider.id}
        initialMethods={provider.payment_methods}
        initialHandles={provider.payment_handles}
        onSaved={(methods, handles) => onUpdated({ payment_methods: methods, payment_handles: handles })}
      />

      <ServiceAreaPanel
        providerId={provider.id}
        city={provider.city}
        state={provider.state}
        initialRadius={provider.service_radius_miles}
        onUpdated={(r) => onUpdated({ service_radius_miles: r })}
      />

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
                <div className="flex items-center gap-2 mb-2">
                  <Crown size={20} className="text-primary" />
                  <h3 className="text-lg font-bold text-foreground">Upgrade to Pro</h3>
                  <Badge className="bg-primary text-primary-foreground text-xs">$29/mo</Badge>
                </div>
                <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-foreground">
                  {["Direct messaging with homeowners", "Priority search placement", "Verified Pro badge", "Job management tools"].map(f => (
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
        </div>
      </div>
    </div>
  );
};

export default ProProfileTab;
