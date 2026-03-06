import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Shield, Clock, Phone, Globe, ExternalLink, BadgeCheck, Crown } from "lucide-react";
import type { ProviderWithStats } from "@/lib/api/providers";

interface ProviderDetailDialogProps {
  provider: ProviderWithStats | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ProviderDetailDialog = ({ provider, open, onOpenChange }: ProviderDetailDialogProps) => {
  if (!provider) return null;

  const rateLabel = provider.currency === "CAD"
    ? `C$${provider.hourly_rate_min}–${provider.hourly_rate_max}`
    : `$${provider.hourly_rate_min}–${provider.hourly_rate_max}`;

  const isWeb = provider.source === "web";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            {provider.subscription_tier === "elite" && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
                <Crown size={10} /> Elite Pro
              </span>
            )}
            {provider.subscription_tier === "pro" && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                <BadgeCheck size={10} /> Pro
              </span>
            )}
            {isWeb && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                <Globe size={10} /> Found online
              </span>
            )}
          </div>
          <DialogTitle className="text-xl">{provider.business_name}</DialogTitle>
          <p className="text-sm text-muted-foreground">{provider.category} · {provider.city}, {provider.state} {provider.country === "US" ? "🇺🇸" : "🇨🇦"}</p>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Rating & Rate */}
          <div className="flex items-center gap-6">
            {provider.avg_rating > 0 ? (
              <div className="flex items-center gap-1.5">
                <Star size={18} className="text-accent fill-accent" />
                <span className="font-semibold text-foreground">{provider.avg_rating}</span>
                {provider.review_count > 0 && (
                  <span className="text-sm text-muted-foreground">({provider.review_count} reviews)</span>
                )}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground italic">Not Yet Rated</span>
            )}
            <span className="text-sm font-semibold text-foreground">{rateLabel}/hr</span>
          </div>

          {/* Description */}
          {provider.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{provider.description}</p>
          )}

          {/* Credentials */}
          <div className="flex flex-wrap gap-2">
            {provider.licensed && (
              <span className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2.5 py-1.5 rounded-full">
                <Shield size={12} /> Licensed
              </span>
            )}
            {provider.insured && (
              <span className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2.5 py-1.5 rounded-full">
                <Shield size={12} /> Insured
              </span>
            )}
            {provider.years_experience > 0 && (
              <span className="text-xs text-muted-foreground bg-secondary px-2.5 py-1.5 rounded-full">
                {provider.years_experience}+ years experience
              </span>
            )}
            <span className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full ${
              provider.available ? "text-primary bg-primary/10" : "text-muted-foreground bg-secondary"
            }`}>
              <Clock size={12} /> {provider.available ? "Available now" : "Currently booked"}
            </span>
          </div>

          {/* Contact info */}
          <div className="space-y-2 border-t border-border pt-4">
            <h4 className="text-sm font-semibold text-foreground">Contact</h4>
            {provider.phone && (
              <a href={`tel:${provider.phone}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                <Phone size={14} /> {provider.phone}
              </a>
            )}
            {provider.website && (
              <a href={provider.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                <ExternalLink size={14} /> {provider.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </a>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin size={14} /> {provider.city}, {provider.state}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            {provider.phone && (
              <Button asChild className="flex-1">
                <a href={`tel:${provider.phone}`}>Call Now</a>
              </Button>
            )}
            {provider.website && (
              <Button variant="outline" asChild className="flex-1">
                <a href={provider.website} target="_blank" rel="noopener noreferrer">
                  Visit Website
                </a>
              </Button>
            )}
            {!provider.phone && !provider.website && (
              <p className="text-sm text-muted-foreground">No contact information available.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProviderDetailDialog;
