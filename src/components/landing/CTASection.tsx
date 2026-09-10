import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const CTASection = () => {
  const navigate = useNavigate();
  return (
    <section className="py-20 md:py-28 bg-secondary">
      <div className="container mx-auto px-4">
        <div className="relative overflow-hidden rounded-2xl bg-primary p-10 text-center shadow-[var(--product-shadow)] md:p-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-primary-foreground mb-4">
            YOUR HOME, HANDLED.
          </h2>
          <p className="text-primary-foreground/80 text-lg max-w-xl mx-auto mb-8">
            Know what's wrong. Know what it costs. Know what to do next.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" variant="secondary" className="text-base px-8 h-12 gap-2" onClick={() => navigate("/auth")}>
               Start Free <ArrowRight size={18} />
            </Button>
            <Button size="lg" variant="ghost" className="text-base px-8 h-12 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" onClick={() => { const el = document.getElementById("features"); el?.scrollIntoView({ behavior: "smooth" }); }}>
              Learn More
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
