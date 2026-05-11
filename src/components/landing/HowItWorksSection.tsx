import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, FileText, MessageSquare, CheckCircle,
  Home, ClipboardList, CalendarCheck, Bell,
  Wrench, ShieldCheck, PackageSearch, RotateCcw,
  Upload, Bot, Shield, Briefcase, Send, Phone, UserCheck,
  Brain, Camera, DollarSign, BookOpen, Download, FileSearch,
  Image as ImageIcon, Sparkles, Inbox, Stethoscope, AlertTriangle, Hammer,
  UserPlus, ListChecks, Send as SendIcon, Star, TrendingUp, BadgeCheck, QrCode, Users
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const homeownerTabs = [
  {
    id: "pros",
    label: "Find a Pro",
    icon: Search,
    steps: [
      {
        icon: Search, step: "01", title: "Describe Your Job",
        description: "Tell us what you need — or let our AI analyze a photo and suggest the right service.",
        route: "/search",
      },
      {
        icon: FileText, step: "02", title: "Get Instant Quotes",
        description: "Receive AI-powered estimates and compare quotes from verified local pros.",
        route: "/estimator",
      },
      {
        icon: MessageSquare, step: "03", title: "Chat & Schedule",
        description: "Message pros directly, agree on timing and price, and book your appointment.",
        route: "/messages",
      },
      {
        icon: CheckCircle, step: "04", title: "Job Done, Review Left",
        description: "Get the work done by a trusted pro, then leave a review to help others.",
        route: "/search",
      },
    ],
  },
  {
    id: "maintenance",
    label: "Maintenance Autopilot",
    icon: CalendarCheck,
    steps: [
      {
        icon: Home, step: "01", title: "Set Up Your Home",
        description: "Answer a few quick questions about your home — type, age, HVAC, roof, and special features like pools or septic.",
        route: "/maintenance",
      },
      {
        icon: ClipboardList, step: "02", title: "AI Generates Your Schedule",
        description: "Our AI creates a personalized 12-month maintenance plan with seasonal tasks, priorities, and product recommendations.",
        route: "/maintenance",
      },
      {
        icon: Bell, step: "03", title: "Get Timely Reminders",
        description: "Receive email reminders at 30, 7, and 1 day before each task — plus day-of alerts so nothing slips through.",
        route: "/maintenance",
      },
      {
        icon: RotateCcw, step: "04", title: "Complete & Auto-Renew",
        description: "Mark tasks done and recurring maintenance automatically schedules for the next cycle. Export to your calendar anytime.",
        route: "/maintenance",
      },
    ],
  },
  {
    id: "binder",
    label: "Digital Home Binder",
    icon: ShieldCheck,
    steps: [
      {
        icon: Home, step: "01", title: "Add Your Home Profile",
        description: "Create a profile for each property with details like location, systems, and year built.",
        route: "/binder",
      },
      {
        icon: Wrench, step: "02", title: "Log Systems & Appliances",
        description: "Track every appliance, system, and fixture — with brand, model, serial number, and install date.",
        route: "/binder",
      },
      {
        icon: PackageSearch, step: "03", title: "Store Warranties & Docs",
        description: "Upload receipts, manuals, and warranty documents. Everything is securely stored in the cloud.",
        route: "/binder",
      },
      {
        icon: ShieldCheck, step: "04", title: "Never Miss an Expiry",
        description: "Get alerts before warranties expire so you can file claims or plan replacements ahead of time.",
        route: "/binder",
      },
    ],
  },
  {
    id: "coverage",
    label: "Coverage Advisor",
    icon: Shield,
    steps: [
      {
        icon: Upload, step: "01", title: "Upload Your Documents",
        description: "Upload your home warranty and insurance policy documents — PDFs, images, or text files.",
        route: "/coverage",
      },
      {
        icon: Shield, step: "02", title: "AI Reads Your Policy",
        description: "Our AI analyzes your coverage documents to understand your limits, deductibles, and exclusions.",
        route: "/coverage",
      },
      {
        icon: Bot, step: "03", title: "Ask Anything",
        description: "Chat with the AI about what's covered, how to file a claim, or whether a repair falls under warranty.",
        route: "/coverage",
      },
      {
        icon: CheckCircle, step: "04", title: "Know Before You Pay",
        description: "Get clear answers about your coverage so you never pay out-of-pocket for something that's covered.",
        route: "/coverage",
      },
    ],
  },
  {
    id: "jobs",
    label: "Job Requests",
    icon: Briefcase,
    steps: [
      {
        icon: Briefcase, step: "01", title: "Post Your Job",
        description: "Describe what you need, select a category, and share your location so nearby pros can find it.",
        route: "/post-job",
      },
      {
        icon: Send, step: "02", title: "Pros Send Bids",
        description: "Interested pros message you first with their bid, experience, and credentials — no unsolicited calls.",
        route: "/post-job",
      },
      {
        icon: UserCheck, step: "03", title: "Accept & Approve",
        description: "Review bids side-by-side, accept the best one, and only then decide if the pro can call you.",
        route: "/post-job",
      },
      {
        icon: Phone, step: "04", title: "Connect & Get It Done",
        description: "Communicate on your terms — message only or approve a call. You stay in control the entire way.",
        route: "/post-job",
      },
    ],
  },
  {
    id: "estimator",
    label: "AI Estimator",
    icon: Brain,
    steps: [
      {
        icon: Camera, step: "01", title: "Snap or Describe",
        description: "Upload a photo of the issue or just describe it — our AI figures out what's going on.",
        route: "/estimator",
      },
      {
        icon: Sparkles, step: "02", title: "AI Analyzes the Job",
        description: "We identify the problem, list materials, and estimate the labor and time needed.",
        route: "/estimator",
      },
      {
        icon: DollarSign, step: "03", title: "Get a Cost Range",
        description: "Receive a realistic price range plus a DIY-vs-Pro recommendation tailored to the job.",
        route: "/estimator",
      },
      {
        icon: UserCheck, step: "04", title: "DIY or Hire a Pro",
        description: "Tackle it yourself with our guidance, or send the estimate to local pros for bids.",
        route: "/estimator",
      },
    ],
  },
  {
    id: "manuals",
    label: "Manual Finder",
    icon: BookOpen,
    steps: [
      {
        icon: FileSearch, step: "01", title: "Enter Brand & Model",
        description: "Type the brand and model number of any appliance, tool, or home system.",
        route: "/manual-search",
      },
      {
        icon: Bot, step: "02", title: "AI Locates the Manual",
        description: "Our AI scours the web to find the official PDF user manual for your exact product.",
        route: "/manual-search",
      },
      {
        icon: BookOpen, step: "03", title: "View On-Site",
        description: "Read the manual right inside HomeHero — no shady redirects, no ads, no signup walls.",
        route: "/manual-search",
      },
      {
        icon: Download, step: "04", title: "Download & Save",
        description: "Download the PDF or attach it to an item in your Digital Home Binder for later.",
        route: "/manual-search",
      },
    ],
  },
  {
    id: "messages",
    label: "Messaging",
    icon: MessageSquare,
    steps: [
      {
        icon: Inbox, step: "01", title: "Reach Out Privately",
        description: "Message any pro directly from their profile — your phone number stays private until you approve it.",
        route: "/messages",
      },
      {
        icon: ImageIcon, step: "02", title: "Share Photos & Details",
        description: "Send pictures of the job, ask questions, and get tailored quotes without a phone call.",
        route: "/messages",
      },
      {
        icon: UserCheck, step: "03", title: "Approve a Call",
        description: "Like the pro? Approve them to call you. Don't like the vibe? Just stop replying — you're in control.",
        route: "/messages",
      },
      {
        icon: CheckCircle, step: "04", title: "Track Job Status",
        description: "Keep the full conversation, photos, and quotes in one thread from request to completion.",
        route: "/messages",
      },
    ],
  },
  {
    id: "triage",
    label: "Symptom Triage",
    icon: Stethoscope,
    steps: [
      {
        icon: Stethoscope, step: "01", title: "Describe the Symptom",
        description: "Type what you're seeing, hearing, or smelling — a strange noise, leak, smell, or odd behavior from any home system.",
        route: "/symptom-triage",
      },
      {
        icon: Sparkles, step: "02", title: "AI Diagnoses Instantly",
        description: "Our AI analyzes the symptom, identifies the likely cause, and flags any urgent safety warnings.",
        route: "/symptom-triage",
      },
      {
        icon: AlertTriangle, step: "03", title: "Get an Urgency Level",
        description: "From Emergency to Monitor — know if you need to act now, schedule a pro, or just keep an eye on it.",
        route: "/symptom-triage",
      },
      {
        icon: Hammer, step: "04", title: "DIY or Hire a Pro",
        description: "Follow the AI's step-by-step DIY guidance, or jump straight to finding the right local pro.",
        route: "/symptom-triage",
      },
    ],
  },
];

const HowItWorksSection = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("pros");

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (detail && tabs.some((t) => t.id === detail)) setActiveTab(detail);
    };
    window.addEventListener("how-it-works:set-tab", handler);
    return () => window.removeEventListener("how-it-works:set-tab", handler);
  }, []);

  const activeData = tabs.find(t => t.id === activeTab)!;

  const handleClick = (step: typeof activeData.steps[0]) => {
    if (step.route) {
      navigate(step.route);
    } else {
      toast({ title: "Coming Soon", description: `${step.title} is under development. Stay tuned!` });
    }
  };

  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-secondary/50">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">How It Works</p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4">
            Simple steps to a well-maintained home
          </h2>
        </div>

        {/* Tabs */}
        <div className="flex justify-center gap-2 mb-12 flex-wrap">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold border transition-all ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground border-primary shadow-md"
                  : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {activeData.steps.map((s, i) => (
            <button
              key={s.step}
              onClick={() => handleClick(s)}
              className="relative text-center cursor-pointer group"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5 group-hover:bg-primary/20 transition-colors">
                <s.icon size={28} className="text-primary" />
              </div>
              <span className="text-xs font-bold text-primary uppercase tracking-widest">Step {s.step}</span>
              <h3 className="font-bold text-lg text-foreground mt-2 mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
              {!s.route && (
                <span className="inline-block mt-3 text-xs font-medium text-muted-foreground bg-secondary px-2 py-1 rounded-full">Coming Soon</span>
              )}
              {i < activeData.steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-[calc(50%+40px)] w-[calc(100%-80px)] h-px bg-border" />
              )}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
