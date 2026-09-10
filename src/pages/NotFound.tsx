import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Compass, ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-24">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
            <Compass className="w-8 h-8 text-primary" />
          </div>
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">404</p>
          <h1 className="font-display text-3xl font-bold text-foreground mb-3">Page not found</h1>
          <p className="text-muted-foreground mb-7">
            The page you're looking for doesn't exist or may have moved.
          </p>
          <Button asChild size="lg" className="rounded-lg gap-2">
            <Link to="/">
              Return Home <ArrowRight size={16} />
            </Link>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default NotFound;
