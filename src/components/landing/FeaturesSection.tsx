import { useState } from "react";
import {
  Wrench, Brain, CalendarCheck, FolderOpen, MessageSquare, Star, Shield,
  Briefcase, BookOpen, Stethoscope, Home, Hammer, Car,
  Inbox, BadgeCheck, Users, QrCode, TrendingUp, Sparkles, FileText, Gauge,
  ShoppingCart, CloudSun, Building2, DollarSign, Repeat, Wallet,
  Zap, Activity, AlertTriangle, FileWarning,
} from "lucide-react";

type Audience = "homeowner" | "pro" | "mechanic";

const homeownerFeatures = [
  {
    icon: Brain,
    title: "What Will This Repair Cost?",
    description: "Describe the issue. Trimbly estimates the cost, materials, and whether to tackle it yourself or call a pro.",
    tab: "estimator",
  },
  {
    icon: Stethoscope,
    title: "What's Wrong?",
    description: "Describe a noise, smell, leak, or odd behavior. Trimbly helps you understand the likely cause, urgency, and next step.",
    tab: "triage",
  },
  {
    icon: Shield,
    title: "Is This Covered?",
    description: "Upload your home warranty and insurance documents. Trimbly helps you understand what may be covered and how to approach a claim.",
    tab: "coverage",
  },
  {
    icon: Zap,
    title: "Energy & Utility Advisor",
    description: "Understand your utility bills and get prioritized upgrades with real cost, savings, and payback numbers — not generic tips.",
    tab: "energy-advisor",
  },
  {
    icon: TrendingUp,
    title: "Home Value Advisor",
    description: "Planning a renovation? See if it pays off at resale before you spend a dime, with a full cost and DIY vs. pro breakdown.",
    tab: "value-advisor",
  },
  {
    icon: Activity,
    title: "System Lifespan Tracker",
    description: "See what's aging out before it breaks — automatically matched against your Home Binder's purchase dates.",
    tab: "systems",
  },
  {
    icon: AlertTriangle,
    title: "Emergency Home Info Card",
    description: "Water, gas, and electrical shutoff locations plus emergency contacts — one printable card per home for when seconds count.",
    tab: "emergency-info",
  },
  {
    icon: FileWarning,
    title: "Quote & Contract Reviewer",
    description: "Paste a contractor's quote or contract and spot potential red flags before you sign anything.",
    tab: "quote-reviewer",
  },
  {
    icon: Car,
    title: "My Garage",
    description: "The same AI diagnosis, coverage checks, and cost breakdowns — for your cars and motorcycles. Log service history, manage insurance & warranty docs, shop parts through Amazon, and find trusted mechanics. Optional add-on for $3.99/month, stacks on any plan including Free.",
    tab: "garage",
  },
  {
    icon: Building2,
    title: "Multi-Home Management",
    description: "Own more than one property? Manage up to 10 homes from a single account, viewed individually or all together on one dashboard.",
  },
  {
    icon: ShoppingCart,
    title: "Smart Product Shopping",
    description: "Find the right supplies on Amazon in one click, with recommendations tailored to each home, vehicle, and maintenance task.",
    tab: "maintenance",
  },
  {
    icon: CalendarCheck,
    title: "Stay Ahead of Maintenance",
    description: "Automated schedules based on your home profile. Never forget an HVAC filter, gutter clean, or seasonal checkup.",
    tab: "maintenance",
  },
  {
    icon: CloudSun,
    title: "Weather Alerts",
    description: "Freeze warnings, heavy rain, high wind, extreme heat — get proactive maintenance alerts tied to your home's location before weather causes damage.",
    tab: "maintenance",
  },
  {
    icon: FolderOpen,
    title: "Remember Everything",
    description: "Keep appliance details, warranties, manuals, past jobs, receipts, projects, and important documents in your Digital Home Binder.",
    tab: "binder",
  },
  {
    icon: BookOpen,
    title: "User Manual Finder",
    description: "Enter any brand and model number and we'll find the official user manual — viewable and downloadable right on Trimbly.",
    tab: "manuals",
  },
  {
    icon: Wrench,
    title: "Find Local Pros",
    description: "Search by service, distance, rating, and availability. Get matched with vetted professionals near you.",
    tab: "pros",
  },
  {
    icon: Briefcase,
    title: "Job Requests & Bidding",
    description: "Post a job and let pros come to you. Review bids, messages, and credentials — you control who can call.",
    tab: "jobs",
  },
  {
    icon: MessageSquare,
    title: "In-App Messaging",
    description: "Chat directly with pros, negotiate quotes, and track job status from request to completion.",
    tab: "messages",
  },
  {
    icon: Hammer,
    title: "Equipment Rentals Marketplace",
    description: "Browse tools and equipment from local pros, message owners in-app, and e-sign legally binding rental agreements stored in your Agreement Archive.",
    tab: "rentals",
  },
  {
    icon: Star,
    title: "Verified Reviews",
    description: "Read honest reviews from real homeowners. Rate your experience and help the community find the best pros.",
    tab: "pros",
  },
];

const proFeatures = [
  {
    icon: DollarSign,
    title: "0% Commission, Ever",
    description: "Trimbly charges a flat subscription — never a cut of your job earnings. Keep 100% of what you make.",
  },
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
    title: "Verified Pro Badge",
    description: "Available on any plan, including Free — pass our one-time $29 background check & document review to show a trust badge before homeowners message you.",
  },
  {
    icon: Gauge,
    title: "Response-Time Badge",
    description: "Auto-calculated 'Replies in under 1 hr' badge on your listing, on any plan — proven speed wins more jobs.",
  },
  {
    icon: Star,
    title: "Auto-Request Reviews",
    description: "After a completed job, send a one-click in-app request asking the homeowner for a review.",
  },
  {
    icon: Users,
    title: "Referral Program",
    description: "Share your unique link with other pros — track signups from your dashboard.",
  },
  {
    icon: Home,
    title: "Local SEO Microsite",
    description: "Your own page at trimbly.com/pros/your-business, on any plan — designed to rank in Google for your service area.",
  },
  {
    icon: QrCode,
    title: "Yard Sign QR Codes",
    description: "Printable yard sign QR that scans straight to your Trimbly profile — turn every job into a marketing channel.",
  },
  {
    icon: Sparkles,
    title: "AI Follow-Up Drafts",
    description: "AI spots homeowners who went quiet and drafts a nudge for you to review and send in one tap.",
  },
  {
    icon: TrendingUp,
    title: "AI Competitor Pricing Intel",
    description: "AI-estimated hourly rate ranges for your trade, localized to your city & state, so you can price competitively and confidently.",
  },
  {
    icon: MessageSquare,
    title: "Message Copilot",
    description: "AI drafts professional replies to homeowner messages — clear, polite, and ready to send in one tap.",
  },
  {
    icon: Hammer,
    title: "Rent Out Your Equipment",
    description: "List tools and equipment for other pros (and subscribed homeowners) to rent, on any plan. ESIGN/UETA-compliant digital agreements included.",
  },
  {
    icon: Repeat,
    title: "Service Plans",
    description: "Set up recurring maintenance service agreements with homeowners — build repeat revenue instead of chasing one-off jobs.",
  },
  {
    icon: Wallet,
    title: "Payment Methods on Profile",
    description: "List the payment methods you accept — cash, Venmo, Zelle, and more — right on your public profile. Trimbly never touches the transaction.",
  },
  {
    icon: Hammer,
    title: "Pro Dashboard",
    description: "Manage leads, quotes, service area, business hours, mileage, gallery, and credentials all in one place.",
  },
];

const mechanicFeatures = [
  {
    icon: DollarSign,
    title: "0% Commission, Ever",
    description: "Trimbly charges a flat subscription — never a cut of your job earnings. Keep 100% of what you make.",
  },
  {
    icon: Inbox,
    title: "Vehicle Job Leads",
    description: "Get matched with car and motorcycle owners posting real repair and maintenance jobs. Send bids directly from your dashboard.",
    tab: "m-leads",
  },
  {
    icon: FileText,
    title: "Unlimited Bids",
    description: "Free mechanics get 3 active bids per month. Paid mechanics bid as much as they want and never miss an opportunity.",
  },
  {
    icon: BadgeCheck,
    title: "Verified Mechanic Badge",
    description: "Available on any plan, including Free — pass our one-time $29 background check & document review to show a trust badge before vehicle owners message you.",
  },
  {
    icon: Gauge,
    title: "Response-Time Badge",
    description: "Auto-calculated 'Replies in under 1 hr' badge on your listing, on any plan — proven speed wins more vehicle jobs.",
  },
  {
    icon: QrCode,
    title: "Shop QR Codes",
    description: "Printable QR that scans straight to your Trimbly mechanic profile — turn every repair into a marketing channel.",
  },
  {
    icon: MessageSquare,
    title: "Message Copilot",
    description: "AI drafts professional replies to vehicle owner messages — clear, polite, and ready to send in one tap.",
  },
  {
    icon: Hammer,
    title: "Rent Out Your Equipment",
    description: "List specialty tools and lifts for other mechanics (and subscribed owners) to rent, on any plan. ESIGN/UETA-compliant digital agreements included.",
  },
  {
    icon: Wallet,
    title: "Payment Methods on Profile",
    description: "List the payment methods you accept — cash, Venmo, Zelle, and more — right on your public profile. Trimbly never touches the transaction.",
  },
  {
    icon: Car,
    title: "Mechanic Dashboard",
    description: "Manage vehicle leads, bids, reviews, messages, and payment methods all in one place.",
  },
];

const FeaturesSection = () => {
  const [audience, setAudience] = useState<Audience>("homeowner");
  const homeownerPrimaryTitles = ["What's Wrong?", "What Will This Repair Cost?", "Is This Covered?", "Stay Ahead of Maintenance", "Remember Everything"];
  const orderedHomeownerFeatures = [...homeownerFeatures].sort((a, b) => {
    const aIndex = homeownerPrimaryTitles.indexOf(a.title);
    const bIndex = homeownerPrimaryTitles.indexOf(b.title);
    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
  const features =
    audience === "homeowner"
      ? orderedHomeownerFeatures
      : audience === "mechanic"
      ? mechanicFeatures
      : proFeatures;

  const handleClick = (feature: { tab?: string }) => {
    if (!feature.tab) return;
    window.dispatchEvent(new CustomEvent("how-it-works:set-tab", { detail: feature.tab }));
    const el = document.getElementById("how-it-works");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="features" className="py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <p className="brand-kicker">The complete Trimbly platform</p>
          <h2 className="brand-title mt-4 mb-4">
            One place for everything that comes with owning a home.
          </h2>
          <p className="text-muted-foreground text-lg">
             From the everyday to the unexpected, every homeowner, provider, and mechanic capability remains close at hand.
          </p>
        </div>

        {/* Audience toggle */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex p-1 rounded-full bg-secondary border border-border">
            <button
              onClick={() => setAudience("homeowner")}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                audience === "homeowner"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Homeowner
            </button>
            <button
              onClick={() => setAudience("pro")}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                audience === "pro"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Pro Provider
            </button>
            <button
              onClick={() => setAudience("mechanic")}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                audience === "mechanic"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Mechanic
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px overflow-hidden rounded-2xl border border-border bg-border">
          {features.map((f) => {
            const clickable = (audience === "homeowner" || audience === "mechanic") && "tab" in f && !!f.tab;
            const Tag = clickable ? "button" : "div";
            return (
              <Tag
                key={f.title}
                onClick={clickable ? () => handleClick(f as any) : undefined}
                 className={`group p-6 transition-all duration-300 text-left ${
                   audience === "homeowner" && homeownerPrimaryTitles.includes(f.title)
                     ? "bg-primary/[0.055] border-t-4 border-primary"
                     : "bg-card"
                 } ${
                  clickable ? "hover:bg-secondary cursor-pointer" : ""
                }`}
              >
                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <f.icon size={20} className="text-primary group-hover:text-primary-foreground transition-colors" />
                </div>
                <h3 className="font-display font-semibold text-lg text-card-foreground mb-2">{f.title}</h3>
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
