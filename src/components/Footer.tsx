import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-border py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-display font-bold text-xs">H</span>
              </div>
              <span className="font-display font-bold text-lg text-foreground">HomeHero</span>
            </Link>
            <p className="text-sm text-muted-foreground">Your home, handled. AI-powered maintenance and trusted local pros.</p>
          </div>
          <div>
            <h4 className="font-semibold text-sm text-foreground mb-3">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
              <li><a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
              <li><a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm text-foreground mb-3">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/about" className="hover:text-foreground transition-colors">About</Link></li>
              
              <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm text-foreground mb-3">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} HomeHero. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
