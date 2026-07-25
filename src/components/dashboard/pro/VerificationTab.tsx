import PayoutSetupPanel from "@/components/pro/PayoutSetupPanel";
import VerificationPanel from "@/components/pro/VerificationPanel";

interface VerificationTabProps {
  providerId: string;
}

const VerificationTab = ({ providerId }: VerificationTabProps) => {
  return (
    <div className="space-y-4">
      <PayoutSetupPanel providerId={providerId} />
      <VerificationPanel providerId={providerId} />
    </div>
  );
};

export default VerificationTab;
