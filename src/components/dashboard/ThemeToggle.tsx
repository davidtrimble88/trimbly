import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Axe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const { vikingModeUnlocked, isPaidAccount } = useAuth();
  // Avoid a light/dark mismatch flash between server-rendered default and the persisted client theme.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const current = mounted ? theme : "light";
  // Redeeming a partner code alone isn't enough — the account also has to
  // currently hold a paid (non-free) tier, i.e. one that will actually be
  // charged once billing turns on. A free-tier account that used a code
  // doesn't get to show off Viking Mode just for signing up.
  // (AuthProvider in useAuth.tsx is what actually falls back to light if
  // eligibility is lost while "viking" is still the saved theme — it's
  // mounted everywhere, not just here, so it also catches logout and
  // browsing to a page without this toggle on it.)
  const showViking = vikingModeUnlocked && isPaidAccount;

  // Everyone gets the plain light/dark toggle they've always had. Only
  // paid accounts that redeemed a partner code with unlocks_viking_mode
  // cycle through a third state — that's the whole point of it being exclusive.
  if (!showViking) {
    const isDark = current === "dark";
    return (
      <Button
        variant="outline"
        size="icon"
        className="rounded-lg"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {isDark ? <Sun size={16} /> : <Moon size={16} />}
      </Button>
    );
  }

  const next: Record<string, string> = { light: "dark", dark: "viking", viking: "light" };
  const icon = current === "dark" ? <Moon size={16} /> : current === "viking" ? <Axe size={16} /> : <Sun size={16} />;
  const label = current === "dark" ? "Switch to Viking Mode" : current === "viking" ? "Switch to light mode" : "Switch to dark mode";

  return (
    <Button
      variant="outline"
      size="icon"
      className={current === "viking" ? "rounded-lg border-primary/50 text-primary viking-ember-pulse" : "rounded-lg"}
      onClick={() => setTheme(next[current] || "light")}
      aria-label={label}
      title={label}
    >
      {icon}
    </Button>
  );
};

export default ThemeToggle;
