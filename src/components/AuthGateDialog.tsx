import { useLocation, useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LogIn, UserPlus } from "lucide-react";

interface AuthGateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
}

/**
 * Shown when a signed-out visitor tries to do something that requires an
 * account (message a pro, save a pro, etc). Both buttons carry the current
 * page along as a `redirect` param so Auth.tsx can send them right back here
 * after logging in or signing up, instead of dropping them on their dashboard.
 */
export default function AuthGateDialog({
  open,
  onOpenChange,
  title = "Sign in to continue",
  description = "Create a free account or log in to message this pro.",
}: AuthGateDialogProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const redirect = encodeURIComponent(location.pathname + location.search);

  const goTo = (mode: "login" | "signup") => {
    onOpenChange(false);
    navigate(`/auth?mode=${mode}&redirect=${redirect}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 mt-2">
          <Button className="rounded-lg" size="lg" onClick={() => goTo("login")}>
            <LogIn size={15} className="mr-1.5" /> Log In
          </Button>
          <Button variant="outline" className="rounded-lg" size="lg" onClick={() => goTo("signup")}>
            <UserPlus size={15} className="mr-1.5" /> Create Free Account
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
