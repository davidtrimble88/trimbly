import { Link } from "react-router-dom";
import { ArrowLeft, HelpCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Helmet } from "react-helmet-async";

const sections: { title: string; faqs: { q: string; a: string }[] }[] = [
  {
    title: "Pricing & Fees",
    faqs: [
      { q: "Does Trimbly take a cut of what pros or mechanics earn?", a: "No. We only charge the monthly subscription. Trimbly does not take any portion of what you earn from your jobs — 100% of what you bill your customers is yours." },
      { q: "Are there any hidden fees or transaction charges?", a: "No hidden fees, no booking fees, no per-lead charges, no payment processing surcharges from us. Your subscription is the only thing you pay Trimbly." },
      { q: "Is there a free plan?", a: "Yes. Homeowners, service pros, and mechanics can all use Trimbly for free. Free mechanic accounts are limited to 3 bids per month, and homeowners have limits on AI features. Upgrade only when you need more." },
      { q: "Can I cancel anytime?", a: "Yes. All subscriptions are month-to-month with no long-term contracts. Cancel anytime from your account and you keep access until the end of your billing period." },
    ],
  },
  {
    title: "Homeowner Subscriptions",
    faqs: [
      { q: "What does the homeowner Pro plan include?", a: "Unlimited AI estimates, maintenance autopilot, the digital home binder, coverage advisor for warranties and insurance, and priority access to local pros." },
      { q: "What is the Multi-Home plan?", a: "Designed for owners with more than one property — manage multiple homes, maintenance schedules, and documents from a single account." },
      { q: "What is My Garage and how much is the add-on?", a: "My Garage is an optional add-on that tracks your vehicles and motorcycles — service history, documents, reminders, and a mechanic job board. It's $2/month added to any paid homeowner subscription." },
    ],
  },
  {
    title: "Service Pro Subscriptions",
    faqs: [
      { q: "How much is the Pro subscription?", a: "Service pros pay a flat monthly subscription for unlimited bids, lead access, profile placement, and dashboard tools. See the Pro Pricing page for current rates." },
      { q: "What's included for service pros?", a: "Unlimited job bids, in-app messaging with homeowners, a verified public profile, photo portfolio (up to 20 images), and access to the local job board." },
      { q: "Do leads cost extra?", a: "No. Leads are included in your subscription — no pay-per-lead, no per-bid charges." },
    ],
  },
  {
    title: "Mechanic Subscriptions",
    faqs: [
      { q: "How much is the Pro Mechanic subscription?", a: "$15/month for unlimited bids, full job board access, photo portfolio (up to 20 images), and your verified mechanic profile." },
      { q: "What can I do on the free mechanic account?", a: "Free mechanic accounts get a public profile and can submit up to 3 bids per month on the vehicle job board. Upgrade to Pro Mechanic for unlimited bidding." },
      { q: "Does Trimbly take a percentage of my repair jobs?", a: "No. You keep 100% of what you earn. We only charge the $15/month subscription." },
    ],
  },
  {
    title: "Privacy & Messaging",
    faqs: [
      { q: "Will my phone number be shared with pros?", a: "No. Trimbly uses a message-first workflow. All initial contact happens through in-app messaging, and your phone number is only shared if you explicitly approve it." },
      { q: "How do I contact a pro?", a: "Send a message from their profile or from a job you've posted. They'll reply in-app, and you decide whether to share contact details from there." },
    ],
  },
];

const FAQ = () => {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: sections.flatMap((s) =>
      s.faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      }))
    ),
  };

  return (
    <div className="min-h-screen">
      <Helmet>
        <title>FAQ | Trimbly Pricing, Fees & Subscriptions</title>
        <meta name="description" content="Answers about Trimbly pricing, fees, and subscription tiers for homeowners, service pros, and mechanics. No hidden fees, no commission on jobs." />
        <link rel="canonical" href="/faq" />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ArrowLeft size={16} /> Back to home
          </Link>

          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
              <HelpCircle className="text-primary" />
            </div>
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Frequently Asked Questions</p>
            <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-6 font-display">
              Clear answers on pricing, fees & plans
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Everything you need to know about Trimbly subscriptions for homeowners, service pros, and mechanics.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-10">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-2xl font-bold text-foreground font-display mb-4">{section.title}</h2>
                <Accordion type="single" collapsible className="bg-card border border-border rounded-2xl divide-y divide-border">
                  {section.faqs.map((f, i) => (
                    <AccordionItem key={i} value={`${section.title}-${i}`} className="border-0 px-6">
                      <AccordionTrigger className="text-left font-semibold">{f.q}</AccordionTrigger>
                      <AccordionContent className="text-muted-foreground leading-relaxed">{f.a}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>
            ))}

            <div className="bg-card border border-border rounded-2xl p-8 text-center">
              <h3 className="text-xl font-bold text-foreground font-display mb-2">Still have questions?</h3>
              <p className="text-muted-foreground mb-4">We're happy to help — reach out anytime.</p>
              <Link to="/contact" className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition">
                Contact us
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default FAQ;
