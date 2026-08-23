import { Link } from "react-router-dom";

// Single source for the Terms/Privacy acceptance checkbox shown on every
// signup form. Previously each of Auth.tsx (homeowner), ProRegister.tsx, and
// MechanicRegister.tsx hand-wrote its own disclaimer text independently —
// the wording had already drifted between the first two, and
// MechanicRegister had no liability disclaimer at all, just a bare
// "I agree to Terms and Privacy Policy". Centralizing here means legal
// copy only needs review/editing in one place per audience.
export type TosAudience = "homeowner" | "provider" | "mechanic";

const DISCLAIMERS: Record<TosAudience, string> = {
  homeowner:
    "I understand Trimbly is not responsible for services rendered by providers, AI-generated content, or any DIY work I choose to perform.",
  provider:
    "I understand Trimbly is a marketplace only and is not responsible for the work I perform, disputes with homeowners, or AI-generated content.",
  mechanic:
    "I understand Trimbly is a marketplace only and is not responsible for the work I perform, disputes with vehicle owners, or AI-generated content.",
};

interface TosAgreementProps {
  audience: TosAudience;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
}

export function TosAgreement({ audience, checked, onCheckedChange, className }: TosAgreementProps) {
  return (
    <label className={`flex items-start gap-2.5 text-sm text-muted-foreground cursor-pointer ${className || ""}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        className="mt-0.5 w-4 h-4 rounded border-border accent-primary"
      />
      <span>
        I agree to the{" "}
        <Link to="/terms" target="_blank" className="text-primary hover:underline font-medium">Terms of Service</Link>
        {" "}and{" "}
        <Link to="/privacy" target="_blank" className="text-primary hover:underline font-medium">Privacy Policy</Link>.{" "}
        {DISCLAIMERS[audience]}
      </span>
    </label>
  );
}
