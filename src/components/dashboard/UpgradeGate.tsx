import { useNavigate } from "react-router-dom";
import { LucideIcon, Crown, Zap, Lock, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UpgradeGateProps {
  /** Caller computes this: e.g. provider.subscription_tier !== "free" */
  hasAccess: boolean;
  featureName: string;
  description: string;
  benefits?: string[];
  /** "/pro-pricing" or "/mechanic-pricing" — billing auto-detects the right tier/price server-side. */
  pricingRoute: string;
  icon?: LucideIcon;
  variant?: "card" | "inline";
  children: React.ReactNode;
}

const UpgradeGate = ({
  hasAccess,
  featureName,
  description,
  benefits,
  pricingRoute,
  icon,
  variant = "card",
  children,
}: UpgradeGateProps) => {
  const navigate = useNavigate();

  if (hasAccess) return <>{children}</>;

  const isMechanic = pricingRoute.includes("mechanic");
  const Icon = icon || (isMechanic ? Zap : Crown);

  if (variant === "inline") {
    return (
      <button
        onClick={() => navigate(pricingRoute)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
      >
        <Lock size={12} /> {featureName} is a paid feature — Upgrade
        <ArrowRight size={12} />
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 p-6">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={20} className="text-primary" />
        <h3 className="text-lg font-bold text-foreground">{featureName}</h3>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-secondary-foreground bg-secondary px-2 py-0.5 rounded-full">
          <Lock size={10} /> Locked
        </span>
      </div>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
      {benefits && benefits.length > 0 && (
        <ul className="space-y-1.5 mb-5">
          {benefits.map((b) => (
            <li key={b} className="flex items-center gap-2 text-sm text-foreground">
              <CheckCircle2 size={14} className="text-primary shrink-0" /> {b}
            </li>
          ))}
        </ul>
      )}
      <Button onClick={() => navigate(pricingRoute)} className="gap-1.5">
        <Icon size={15} /> Upgrade to unlock
      </Button>
    </div>
  );
};

export default UpgradeGate;
