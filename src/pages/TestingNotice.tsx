import { useNavigate, useSearchParams } from "react-router-dom";
import { TestingWelcomeModal } from "@/components/onboarding/TestingWelcomeModal";

export const TESTING_NOTICE_ACK_KEY = "trimbly_testing_notice_ack";

// Standalone stop-over shown right after login during the testing period.
// The modal itself is not dismissible — acknowledging it stores a local flag
// and continues on to wherever the user was headed.
export default function TestingNotice() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/dashboard";

  return (
    <div className="min-h-screen bg-background">
      <TestingWelcomeModal
        open
        onAcknowledge={() => {
          try {
            localStorage.setItem(TESTING_NOTICE_ACK_KEY, "1");
          } catch {
            /* storage unavailable — just continue */
          }
          navigate(next, { replace: true });
        }}
      />
    </div>
  );
}
