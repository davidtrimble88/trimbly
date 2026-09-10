import { useNavigate } from "react-router-dom";
import {
  Wrench, CalendarCheck, ShieldCheck, Lightbulb, FolderOpen,
  BriefcaseBusiness, ArrowRight, Car, ShoppingCart, BookOpen, House,
} from "lucide-react";
import BrandMark from "@/components/BrandMark";

type Job = {
  icon: typeof Wrench;
  title: string;
  description: string;
  route: string;
  span?: string;
  featured?: boolean;
  cta?: string;
};

const jobs: Job[] = [
  {
    icon: Wrench,
    title: "Fix It",
    description:
      "Diagnose problems, understand what's happening, get DIY guidance, and know the next step.",
    route: "/symptom-triage",
    span: "lg:col-span-2 lg:row-span-2",
    featured: true,
    cta: "Start with what's wrong",
  },
  {
    icon: CalendarCheck,
    title: "Stay Ahead",
    description:
      "Maintenance schedules, weather alerts, system lifespans, and reminders.",
    route: "/maintenance",
  },
  {
    icon: ShieldCheck,
    title: "Protect It",
    description:
      "Warranty and insurance coverage, important documents, and home information.",
    route: "/coverage",
  },
  {
    icon: Lightbulb,
    title: "Know It",
    description:
      "Understand your home's systems, energy use, value, manuals, and history.",
    route: "/systems",
  },
  {
    icon: FolderOpen,
    title: "Keep It Organized",
    description:
      "Home Binder, receipts, service history, warranties, manuals, and important information.",
    route: "/binder",
    span: "lg:col-span-2",
  },
  {
    icon: BriefcaseBusiness,
    title: "Get It Done",
    description:
      "Shop for products, rent equipment, request bids, and connect with trusted local pros.",
    route: "/search",
    span: "lg:col-span-3",
  },
];

const extensions = [
  { icon: Car, label: "Garage" },
  { icon: ShoppingCart, label: "Shopping" },
  { icon: BookOpen, label: "Rentals" },
  { icon: House, label: "Multiple Homes" },
];

const HomeJobsSection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="mb-12 max-w-3xl">
          <div className="flex items-center gap-3">
            <BrandMark className="h-10 w-10" />
            <p className="brand-kicker">The whole-home platform</p>
          </div>
          <h2 className="brand-title mt-4">
            One home. A lot to manage.
            <br />
            One place to do it.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Trimbly brings the important parts of homeownership together — from
            fixing a problem today to staying ahead of maintenance, protecting
            your investment, keeping your records organized, understanding your
            home, and getting help when you need it.
          </p>
        </div>

        <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border lg:auto-rows-fr lg:grid-cols-3">
          {jobs.map((job) => {
            const Icon = job.icon;
            return (
              <button
                key={job.title}
                onClick={() => navigate(job.route)}
                className={`group flex flex-col text-left transition-colors hover:bg-secondary ${
                  job.span ?? ""
                } ${job.featured ? "bg-primary/[0.055] p-7 lg:p-10" : "bg-card p-6"}`}
              >
                <div
                  className={`flex items-center gap-3 ${job.featured ? "mb-5" : "mb-4"}`}
                >
                  <div
                    className={`flex items-center justify-center rounded-full transition-colors group-hover:bg-primary ${
                      job.featured ? "bg-primary/15 p-3" : "bg-primary/10 p-2.5"
                    }`}
                  >
                    <Icon
                      className={`text-primary transition-colors group-hover:text-primary-foreground ${
                        job.featured ? "h-6 w-6" : "h-5 w-5"
                      }`}
                    />
                  </div>
                  <h3
                    className={`font-display font-bold text-foreground ${
                      job.featured ? "text-2xl" : "text-lg"
                    }`}
                  >
                    {job.title}
                  </h3>
                </div>
                <p
                  className={`text-muted-foreground leading-relaxed ${
                    job.featured ? "text-base lg:text-lg" : "text-sm"
                  }`}
                >
                  {job.description}
                </p>
                {job.featured && job.cta && (
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-6 text-sm font-bold text-primary">
                    {job.cta} <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-semibold text-foreground/70">
          <span className="text-muted-foreground">Also part of your home:</span>
          {extensions.map(({ icon: Icon, label }) => (
            <span key={label} className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-intelligence" />
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HomeJobsSection;
