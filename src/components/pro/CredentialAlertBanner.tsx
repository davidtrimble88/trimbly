import AttentionBanner from "@/components/dashboard/AttentionBanner";

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

  const items = alerts.map((a) =>
    a.expired
      ? `${a.label}: expired ${Math.abs(a.days)} day${Math.abs(a.days) !== 1 ? "s" : ""} ago`
      : `${a.label}: expires in ${a.days} day${a.days !== 1 ? "s" : ""}`
  );

  return (
    <AttentionBanner
      severity={anyExpired ? "danger" : "warning"}
      title={anyExpired ? "Credentials expired" : "Credentials expiring soon"}
      items={items}
      actionLabel="Update"
      onAction={onGoToTools}
    />
  );
}
