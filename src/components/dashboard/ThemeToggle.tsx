import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Axe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const { vikingModeUnlocked } = useAuth();
  // Avoid a light/dark mismatch flash between server-rendered default and the persisted client theme.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const current = mounted ? theme : "light";

  // Everyone gets the plain light/dark toggle they've always had. Only
  // accounts that redeemed a partner code with unlocks_viking_mode cycle
  // through a third state — that's the whole point of it being exclusive.
  if (!vikingModeUnlocked) {
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
      className={current === "viking" ? "rounded-lg border-primary/50 text-primary" : "rounded-lg"}
      onClick={() => setTheme(next[current] || "light")}
      aria-label={label}
      title={label}
    >
      {icon}
    </Button>
  );
};

export default ThemeToggle;
