import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Globe, DollarSign, Award, Shield, Pencil } from "lucide-react";
import type { ProviderProfile } from "./types";

interface BusinessInfoCardProps {
  provider: ProviderProfile;
  onEdit: () => void;
}

const BusinessInfoCard = ({ provider, onEdit }: BusinessInfoCardProps) => {
  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Business</h3>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">Business Name:</span> <span className="font-medium text-foreground ml-1">{provider.business_name}</span></div>
            <div><span className="text-muted-foreground">Category:</span> <span className="font-medium text-foreground ml-1">{provider.category}</span></div>
            <div className="flex items-center gap-1"><MapPin size={13} className="text-muted-foreground" /> <span className="text-foreground">{provider.city}, {provider.state}</span></div>
            {provider.phone && <div className="flex items-center gap-1"><Phone size={13} className="text-muted-foreground" /> <span className="text-foreground">{provider.phone}</span></div>}
            {provider.website && <div className="flex items-center gap-1"><Globe size={13} className="text-muted-foreground" /> <a href={provider.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">{provider.website}</a></div>}
          </div>
          {provider.description && (
            <p className="text-sm text-muted-foreground mt-3 bg-muted/50 rounded-lg p-3">{provider.description}</p>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Rates & Experience</h3>
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-1"><DollarSign size={13} className="text-primary" /> ${provider.hourly_rate_min}–${provider.hourly_rate_max}/hr</div>
            {provider.years_experience && <div className="flex items-center gap-1"><Award size={13} className="text-primary" /> {provider.years_experience} years experience</div>}
            <div className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${provider.available ? "bg-primary" : "bg-muted-foreground"}`} />
              {provider.available ? "Available" : "Unavailable"}
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Credentials</h3>
          <div className="flex flex-wrap gap-3">
            {provider.licensed ? (
              <Badge variant="outline" className="gap-1"><Shield size={12} /> Licensed {provider.license_number && `· ${provider.license_number}`}</Badge>
            ) : (
              <Badge variant="secondary" className="text-muted-foreground">Not Licensed</Badge>
            )}
            {provider.insured ? (
              <Badge variant="outline" className="gap-1"><Shield size={12} /> Insured</Badge>
            ) : (
              <Badge variant="secondary" className="text-muted-foreground">Not Insured</Badge>
            )}
          </div>
        </div>

        <Button onClick={onEdit} variant="outline" className="gap-1.5">
          <Pencil size={14} /> Edit Profile
        </Button>
      </CardContent>
    </Card>
  );
};

export default BusinessInfoCard;
