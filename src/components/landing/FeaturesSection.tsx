import { useState } from "react";
import {
  Wrench, Brain, CalendarCheck, FolderOpen, MessageSquare, Star, Shield,
  Briefcase, BookOpen, Stethoscope, Home, Hammer, Car,
  Inbox, BadgeCheck, Users, QrCode, TrendingUp, Sparkles, FileText, Gauge,
  ShoppingCart
} from "lucide-react";

type Audience = "homeowner" | "pro" | "mechanic";

const homeownerFeatures = [
  {
    icon: Wrench,
    title: "Find Local Pros",
    description: "Search by service, distance, rating, and availability. Get matched with vetted professionals near you.",
    tab: "pros",
  },
  {
    icon: Brain,
    title: "AI Job Estimator",
    description: "Snap a photo, describe the issue, and get instant cost estimates, material lists, and DIY vs. pro recommendations.",
    tab: "estimator",
  },
  {
    icon: CalendarCheck,
    title: "Maintenance Autopilot",
    description: "Automated schedules based on your home profile. Never forget an HVAC filter, gutter clean, or seasonal checkup.",
    tab: "maintenance",
  },
  {
    icon: FolderOpen,
    title: "Digital Home Binder",
    description: "Store appliance info, warranties, past jobs, receipts, and documents — all organized in one dashboard.",
    tab: "binder",
  },
  {
    icon: Shield,
    title: "Coverage Advisor",
    description: "Upload your home warranty and insurance docs, then ask AI questions about what's covered and how to file claims.",
    tab: "coverage",
  },
  {
    icon: MessageSquare,
    title: "In-App Messaging",
    description: "Chat directly with pros, share photos, negotiate quotes, and track job status from request to completion.",
    tab: "messages",
  },
  {
    icon: Briefcase,
    title: "Job Requests & Bidding",
    description: "Post a job and let pros come to you. Review bids, messages, and credentials — you control who can call.",
    tab: "jobs",
  },
  {
    icon: BookOpen,
    title: "User Manual Finder",
    description: "Enter any brand and model number and we'll find the official user manual — viewable and downloadable right on Trimbly.",
    tab: "manuals",
  },
  {
    icon: Stethoscope,
    title: "AI Symptom Triage",
    description: "Describe a noise, smell, or odd behavior — get an instant AI diagnosis, urgency level, safety warnings, and DIY-vs-Pro guidance.",
    tab: "triage",
  },
  {
    icon: Hammer,
    title: "Equipment Rentals Marketplace",
    description: "Browse tools and equipment from local pros, message owners in-app, and e-sign legally binding rental agreements stored in your Agreement Archive.",
    tab: "rentals",
  },
  {
    icon: ShoppingCart,
    title: "Smart Product Shopping",
    description: "AI-powered product recommendations for every maintenance task. Find the right supplies on Amazon in one click, tailored to your home or vehicle.",
    tab: "maintenance",
  },
  {
    icon: Star,
    title: "Verified Reviews",
    description: "Read honest reviews from real homeowners. Rate your experience and help the community find the best pros.",
    tab: "pros",
  },
  {
    icon: Car,
    title: "My Garage",
    description: "Track vehicles and motorcycles, log service history, get maintenance reminders, manage insurance & warranty docs with AI claim help, shop parts through Amazon, and find trusted mechanics — an optional add-on for complete ownership peace of mind.",
    tab: "garage",
  },
];

const proFeatures = [
  {
    icon: Inbox,
    title: "Local Job Leads",
    description: "Get matched with homeowners near you posting real jobs. Send bids directly from your dashboard — no cold calls.",
  },
  {
    icon: FileText,
    title: "Unlimited Bids",
    description: "Free pros get 5 active bids per month. Paid pros bid as much as they want and never miss an opportunity.",
  },
  {
    icon: BadgeCheck,
    title: "Verified Badge & Faster Approvals",
    description: "Show a trust badge on your profile and get faster homeowner phone-call approvals to close jobs quickly.",
  },
  {
    icon: Gauge,
    title: "Response-Time Badge",
    description: "Auto-calculated 'Replies in under 1 hr' badge on your listing — proven speed wins more jobs.",
  },
  {
    icon: Star,
    title: "Auto-Request Reviews",
    description: "After a completed job, an automated text and email goes out asking the homeowner for a review.",
  },
  {
    icon: Users,
    title: "Referral Program",
    description: "Share your unique link with other pros and earn credit toward your subscription for every signup.",
  },
  {
    icon: Home,
    title: "Local SEO Microsite",
    description: "Your own page at trimbly.com/pros/your-business — designed to rank in Google for your service area.",
  },
  {
    icon: QrCode,
    title: "Yard Sign QR Codes",
    description: "Printable yard sign QR that scans straight to your Trimbly profile — turn every job into a marketing channel.",
  },
  {
    icon: Sparkles,
    title: "AI Follow-Up Sequences",
    description: "Automatic nudges to homeowners who went quiet — recover lost leads while you're out on the job.",
  },
  {
    icon: TrendingUp,
    title: "AI Competitor Pricing Intel",
    description: "See what other pros in your zip charge per hour and per job so you can price competitively and confidently.",
  },
  {
    icon: MessageSquare,
    title: "Message Copilot",
    description: "AI drafts professional replies to homeowner messages — clear, polite, and ready to send in one tap.",
  },
  {
    icon: Hammer,
    title: "Rent Out Your Equipment",
    description: "List tools and equipment for other pros (and subscribed homeowners) to rent. ESIGN/UETA-compliant digital agreements, audit trail, and signed-contract archive included.",
  },
  {
    icon: Hammer,
    title: "Pro Dashboard",
    description: "Manage leads, quotes, service area, business hours, mileage, gallery, and credentials all in one place.",
  },
];

const FeaturesSection = () => {
  const [audience, setAudience] = useState<Audience>("homeowner");
  const features = audience === "homeowner" ? homeownerFeatures : proFeatures;

  const handleClick = (feature: { tab?: string }) => {
    if (audience !== "homeowner" || !feature.tab) return;
    window.dispatchEvent(new CustomEvent("how-it-works:set-tab", { detail: feature.tab }));
    const el = document.getElementById("how-it-works");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="features" className="py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Features</p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4">
            Everything you need
          </h2>
          <p className="text-muted-foreground text-lg">
            Choose your view — we built Trimbly for both sides of the job.
          </p>
        </div>

        {/* Audience toggle */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex p-1 rounded-full bg-secondary border border-border">
            <button
              onClick={() => setAudience("homeowner")}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                audience === "homeowner"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Homeowner
            </button>
            <button
              onClick={() => setAudience("pro")}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                audience === "pro"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Pro Provider
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => {
            const clickable = audience === "homeowner" && "tab" in f && !!f.tab;
            const Tag = clickable ? "button" : "div";
            return (
              <Tag
                key={f.title}
                onClick={clickable ? () => handleClick(f as any) : undefined}
                className={`group p-6 rounded-xl bg-card border border-border transition-all duration-300 text-left ${
                  clickable ? "hover:border-primary/30 hover:shadow-lg cursor-pointer" : ""
                }`}
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <f.icon size={24} className="text-primary" />
                </div>
                <h3 className="font-bold text-lg text-card-foreground mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.description}</p>
              </Tag>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
