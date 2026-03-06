import { Button } from "@/components/ui/button";
import { Star, MapPin, Shield, Clock, BadgeCheck, Crown, Globe, ExternalLink } from "lucide-react";
import type { ProviderWithStats } from "@/lib/api/providers";

interface ProviderCardProps {
  provider: ProviderWithStats;
  onRequestQuote?: (provider: ProviderWithStats) => void;
}

const tierConfig = {
  elite: { label: "Elite Pro", color: "bg-accent text-accent-foreground", icon: Crown },
  pro: { label: "Pro", color: "bg-primary/10 text-primary", icon: BadgeCheck },
  free: { label: null, color: "", icon: null },
};

const ProviderCard = ({ provider, onRequestQuote }: ProviderCardProps) => {
  const isWeb = provider.source === "web";
  const rateLabel = isWeb
    ? "Contact for pricing"
    : provider.currency === "CAD"
      ? `C$${provider.hourly_rate_min}–${provider.hourly_rate_max}/hr`
      : `$${provider.hourly_rate_min}–${provider.hourly_rate_max}/hr`;

  const tier = tierConfig[provider.subscription_tier] || tierConfig.free;
  const isPaid = provider.subscription_tier !== "free";
  

  return (
    <div className={`rounded-xl border bg-card p-6 transition-all ${
      isPaid
        ? "border-primary/30 shadow-md hover:shadow-lg ring-1 ring-primary/10"
        : "border-border hover:border-primary/30 hover:shadow-lg"
    }`}>
      {/* Top badges row */}
      <div className="flex items-center gap-2 mb-3">
        {tier.label && tier.icon && (
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${tier.color}`}>
            <tier.icon size={12} />
            {tier.label}
          </span>
        )}
        {isWeb && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full">
            <Globe size={10} /> Found online
          </span>
        )}
      </div>

      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-card-foreground">{provider.business_name}</h3>
          <span className="text-xs text-muted-foreground">{provider.category}</span>
        </div>
        <span className="text-xs">{provider.country === "US" ? "🇺🇸" : "🇨🇦"}</span>
      </div>

      {provider.description && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{provider.description}</p>
      )}

      {/* Credentials */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {provider.licensed && (
          <span className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-1 rounded-full">
            <Shield size={12} /> Licensed
          </span>
        )}
        {provider.insured && (
          <span className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-1 rounded-full">
            <Shield size={12} /> Insured
          </span>
        )}
        {provider.years_experience > 0 && (
          <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full">
            {provider.years_experience}+ yrs
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
        {provider.avg_rating > 0 ? (
          <span className="flex items-center gap-1">
            <Star size={14} className="text-accent fill-accent" />
            {provider.avg_rating} ({provider.review_count})
            {provider.rating_source && (
              <span className="text-xs text-muted-foreground ml-0.5">· {provider.rating_source}</span>
            )}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground italic">Not Yet Rated</span>
        )}
        <span className="flex items-center gap-1">
          <MapPin size={14} /> {provider.city}, {provider.state}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span className={`text-sm font-semibold ${isWeb ? "text-muted-foreground italic" : "text-card-foreground"}`}>{rateLabel}</span>
        <div className="flex items-center gap-2">
          {isWeb && provider.website ? (
            <a
              href={provider.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink size={12} /> Website
            </a>
          ) : (
            <span className={`flex items-center gap-1 text-xs ${provider.available ? "text-primary" : "text-muted-foreground"}`}>
              <Clock size={12} /> {provider.available ? "Available" : "Booked"}
            </span>
          )}
          <Button size="sm" disabled={!provider.available} onClick={() => onRequestQuote?.(provider)}>
            {isWeb ? "View Details" : provider.available ? "Request Quote" : "Unavailable"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProviderCard;
