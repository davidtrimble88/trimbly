import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const CTASection = () => {
  const navigate = useNavigate();
  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="rounded-3xl bg-primary p-12 md:p-16 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-primary-foreground mb-4">
            Ready to be your home's hero?
          </h2>
          <p className="text-primary-foreground/80 text-lg max-w-xl mx-auto mb-8">
            Join HomeHero today and take control of your home maintenance — with trusted pros and smart AI at your fingertips.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" variant="secondary" className="text-base px-8 h-12 gap-2" onClick={() => navigate("/auth")}>
              Get Started Free <ArrowRight size={18} />
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
