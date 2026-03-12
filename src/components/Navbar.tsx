import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user, profileName, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-display font-bold text-sm">H</span>
          </div>
          <span className="font-display font-bold text-xl text-foreground">HomeHero</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <a href="/#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
          <a href="/#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
          <a href="/#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
          <a href="/#pros" className="text-sm text-muted-foreground hover:text-foreground transition-colors">For Pros</a>
        </div>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <span className="text-sm text-muted-foreground">{profileName || user.user_metadata?.full_name || user.email}</span>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut size={16} className="mr-1" /> Sign Out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>Dashboard</Button>
              <Button size="sm" onClick={() => navigate("/auth")}>Get Started</Button>
            </>
          )}
        </div>

        <button className="md:hidden text-foreground" onClick={() => setOpen(!open)}>
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-background p-4 space-y-3 animate-fade-in">
          <a href="/#features" className="block text-sm text-muted-foreground" onClick={() => setOpen(false)}>Features</a>
          <a href="/#how-it-works" className="block text-sm text-muted-foreground" onClick={() => setOpen(false)}>How It Works</a>
          <a href="/#pricing" className="block text-sm text-muted-foreground" onClick={() => setOpen(false)}>Pricing</a>
          <a href="/#pros" className="block text-sm text-muted-foreground" onClick={() => setOpen(false)}>For Pros</a>
          <div className="flex gap-2 pt-2">
            {user ? (
              <Button variant="ghost" size="sm" className="flex-1" onClick={() => { setOpen(false); handleSignOut(); }}>
                <LogOut size={16} className="mr-1" /> Sign Out
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="flex-1" onClick={() => { setOpen(false); navigate("/auth"); }}>Log In</Button>
                <Button size="sm" className="flex-1" onClick={() => { setOpen(false); navigate("/auth"); }}>Get Started</Button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
