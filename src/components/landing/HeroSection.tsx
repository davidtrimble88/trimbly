import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Zap, Star } from "lucide-react";

const HeroSection = () => {
  const navigate = useNavigate();
  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 right-0 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8 animate-fade-in-up">
            <Zap size={14} />
            AI-Powered Home Maintenance
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground leading-[1.1] mb-6 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            Your Home,{" "}
            <span className="text-primary">Handled.</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            Find trusted local pros in seconds, get AI-powered cost estimates, and never miss a maintenance task again — all in one app.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
            <Button size="lg" className="text-base px-8 h-12 gap-2" onClick={() => navigate("/search")}>
              Find a Pro Near You <ArrowRight size={18} />
            </Button>
            <Button variant="outline" size="lg" className="text-base px-8 h-12" onClick={() => navigate("/pro-pricing")}>
              I'm a Service Provider
            </Button>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-8 text-muted-foreground animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
            <div className="flex items-center gap-2 text-sm">
              <Shield size={16} className="text-primary" />
              Licensed & Insured Pros
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Star size={16} className="text-accent" />
              Verified Reviews
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Zap size={16} className="text-primary" />
              AI Cost Estimates
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
