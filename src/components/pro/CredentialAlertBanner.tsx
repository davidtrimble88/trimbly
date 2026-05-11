import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  licenseExpiry: string | null;
  insuranceExpiry: string | null;
  onGoToTools: () => void;
};

function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const ms = new Date(date).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export default function CredentialAlertBanner({ licenseExpiry, insuranceExpiry, onGoToTools }: Props) {
  const lic = daysUntil(licenseExpiry);
  const ins = daysUntil(insuranceExpiry);

  const alerts: { label: string; days: number; expired: boolean }[] = [];
  if (lic !== null && lic <= 90) alerts.push({ label: "License", days: lic, expired: lic < 0 });
  if (ins !== null && ins <= 90) alerts.push({ label: "Insurance", days: ins, expired: ins < 0 });

  if (alerts.length === 0) return null;

  const anyExpired = alerts.some((a) => a.expired);

  return (
    <div className={`mb-6 rounded-lg border p-4 flex items-start gap-3 ${anyExpired ? "border-destructive/50 bg-destructive/10" : "border-yellow-500/50 bg-yellow-500/10"}`}>
      <AlertTriangle className={`mt-0.5 shrink-0 ${anyExpired ? "text-destructive" : "text-yellow-600"}`} size={20} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-foreground">
          {anyExpired ? "Credentials expired" : "Credentials expiring soon"}
        </p>
        <ul className="text-sm text-muted-foreground mt-1 space-y-0.5">
          {alerts.map((a) => (
            <li key={a.label}>
              {a.label}: {a.expired
                ? <span className="text-destructive font-medium">expired {Math.abs(a.days)} day{Math.abs(a.days) !== 1 ? "s" : ""} ago</span>
                : <span className="font-medium">expires in {a.days} day{a.days !== 1 ? "s" : ""}</span>}
            </li>
          ))}
        </ul>
      </div>
      <Button size="sm" variant="outline" onClick={onGoToTools}>Update</Button>
    </div>
  );
}
