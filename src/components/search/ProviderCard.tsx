import { Button } from "@/components/ui/button";
import { Star, MapPin, Shield, Clock } from "lucide-react";
import type { ProviderWithStats } from "@/lib/api/providers";

interface ProviderCardProps {
  provider: ProviderWithStats;
  onRequestQuote?: (provider: ProviderWithStats) => void;
}

const ProviderCard = ({ provider, onRequestQuote }: ProviderCardProps) => {
  const rateLabel = provider.currency === "CAD"
    ? `C$${provider.hourly_rate_min}–${provider.hourly_rate_max}`
    : `$${provider.hourly_rate_min}–${provider.hourly_rate_max}`;

  return (
    <div className="rounded-xl border border-border bg-card p-6 hover:border-primary/30 hover:shadow-lg transition-all">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-card-foreground">{provider.business_name}</h3>
          <span className="text-xs text-muted-foreground">{provider.category}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs">{provider.country === "US" ? "🇺🇸" : "🇨🇦"}</span>
          {provider.licensed && (
            <span className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-1 rounded-full">
              <Shield size={12} /> Licensed
            </span>
          )}
        </div>
      </div>
      {provider.description && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{provider.description}</p>
      )}
      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
        <span className="flex items-center gap-1">
          <Star size={14} className="text-accent fill-accent" />
          {provider.avg_rating > 0 ? `${provider.avg_rating} (${provider.review_count})` : "New"}
        </span>
        <span className="flex items-center gap-1">
          <MapPin size={14} /> {provider.city}, {provider.state}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-card-foreground">{rateLabel}/hr</span>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1 text-xs ${provider.available ? "text-primary" : "text-muted-foreground"}`}>
            <Clock size={12} /> {provider.available ? "Available" : "Booked"}
          </span>
          <Button size="sm" disabled={!provider.available} onClick={() => onRequestQuote?.(provider)}>
            {provider.available ? "Request Quote" : "Unavailable"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProviderCard;
