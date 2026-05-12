import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Footer = () => {
  const { user } = useAuth();
  return (
    <footer className="border-t border-border py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-5 gap-8 mb-8">
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-display font-bold text-xs">H</span>
              </div>
              <span className="font-display font-bold text-lg text-foreground">HomeHero</span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-sm">Your home, handled. AI-powered maintenance and trusted local pros.</p>
          </div>
          <div>
            <h4 className="font-semibold text-sm text-foreground mb-3">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/#features" className="hover:text-foreground transition-colors">Features</Link></li>
              <li><Link to="/#pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
              <li><Link to="/#how-it-works" className="hover:text-foreground transition-colors">How It Works</Link></li>
              <li><Link to="/search" className="hover:text-foreground transition-colors">Find a Pro</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm text-foreground mb-3">For Pros</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/pro-register" className="hover:text-foreground transition-colors">Become a Pro</Link></li>
              <li><Link to="/pro-pricing" className="hover:text-foreground transition-colors">Pro Pricing</Link></li>
              <li><Link to="/job-board" className="hover:text-foreground transition-colors">Job Board</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm text-foreground mb-3">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/about" className="hover:text-foreground transition-colors">About</Link></li>
              <li><Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
              <li><Link to="/help" className="hover:text-foreground transition-colors">Help Center</Link></li>
              <li><Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
              <li><Link to="/staff" className="text-muted-foreground/40 hover:text-muted-foreground transition-colors text-xs">Staff Portal</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} HomeHero. All rights reserved.
          {user && (
            <>
              <span className="mx-2 text-muted-foreground/30">·</span>
              <Link to="/cancel-subscription" className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                Cancel subscription
              </Link>
            </>
          )}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
