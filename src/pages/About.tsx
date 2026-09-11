import { Link } from "react-router-dom";
import { ArrowLeft, Shield, Users, Wrench, Heart, Target, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const values = [
  { icon: Shield, title: "Trust & Transparency", description: "Every pro is verified. Every review is real. We believe homeowners deserve full confidence in who they hire." },
  { icon: Users, title: "Community First", description: "We're building a marketplace where homeowners and pros both win — fair pricing, quality work, lasting relationships." },
  { icon: Wrench, title: "Proactive Care", description: "Your home is your biggest investment. We help you maintain it before small issues become expensive problems." },
  { icon: Lightbulb, title: "AI-Powered Simplicity", description: "Smart technology should make life easier, not more complicated. We use AI to automate the tedious stuff." },
];

const About = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ArrowLeft size={16} /> Back to home
          </Link>

          {/* Hero */}
          <div className="text-center max-w-3xl mx-auto mb-20">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">About Trimbly</p>
            <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-6 font-display">
              Your home, handled.
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Trimbly is an AI-powered home management platform that helps homeowners stay on top of maintenance, 
              find trusted local professionals, and keep every detail of their home organized — all in one place.
            </p>
          </div>

          {/* Mission */}
          <div className="max-w-4xl mx-auto mb-20">
            <div className="bg-card border border-border rounded-2xl p-8 md:p-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Target size={22} className="text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground font-display">Our Mission</h2>
              </div>
              <p className="text-muted-foreground text-lg leading-relaxed mb-4">
                Home maintenance shouldn't be stressful, confusing, or expensive. We built Trimbly to give every 
                homeowner a personal maintenance expert — powered by AI, backed by real professionals.
              </p>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Whether you just bought your first home or you've been a homeowner for decades, Trimbly helps you 
                protect your investment with personalized maintenance schedules, instant cost estimates, and a 
                curated network of verified local pros.
              </p>
            </div>
          </div>


          {/* Values */}
          <div className="max-w-4xl mx-auto mb-20">
            <h2 className="text-2xl md:text-3xl font-extrabold text-foreground text-center mb-12 font-display">What We Stand For</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {values.map(v => (
                <div key={v.title} className="p-6 rounded-2xl border border-border bg-card hover:border-primary/20 transition-colors">
                  <v.icon size={24} className="text-primary mb-4" />
                  <h3 className="font-bold text-lg text-foreground mb-2">{v.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{v.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Heart size={20} className="text-primary" />
              <h2 className="text-2xl font-bold text-foreground font-display">Join the Trimbly Community</h2>
            </div>
            <p className="text-muted-foreground mb-6">
              Whether you're a homeowner looking for peace of mind or a pro looking to grow, we'd love to have you.
            </p>
            <div className="flex gap-3 justify-center">
              <Button size="lg" asChild><Link to="/auth">Get Started</Link></Button>
              <Button size="lg" variant="outline" asChild><Link to="/pro-pricing">Join as a Pro</Link></Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default About;
