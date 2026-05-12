import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  HelpCircle, Search, Home, CalendarCheck, FileText, Wrench, Shield,
  MessageSquare, Briefcase, Crown, User, Mail
} from "lucide-react";

interface FAQ {
  q: string;
  a: string;
}

interface Topic {
  icon: typeof HelpCircle;
  title: string;
  description: string;
  faqs: FAQ[];
}

const TOPICS: Topic[] = [
  {
    icon: User,
    title: "Account & Sign-In",
    description: "Signing up, logging in, and managing your profile.",
    faqs: [
      {
        q: "How do I create an account?",
        a: "Click 'Get Started' in the top-right and choose Homeowner or Service Provider. You can sign up with email and password — no email verification required, you're in immediately.",
      },
      {
        q: "I forgot my password. How do I reset it?",
        a: "Go to the login page and click 'Forgot password'. We'll email you a secure reset link.",
      },
      {
        q: "Can I switch between homeowner and provider accounts?",
        a: "Each account has one type. If you need both, create a separate account with a different email for the provider side.",
      },
    ],
  },
  {
    icon: Home,
    title: "Homes & Multi-Property",
    description: "Adding homes and managing multiple properties.",
    faqs: [
      {
        q: "How many homes can I add?",
        a: "Free and Pro tiers support 1 home. Home Super Hero supports up to 10 homes with all Pro features unlocked for each.",
      },
      {
        q: "Can I auto-fill my home details?",
        a: "Yes — when adding a home, paste a Zillow URL and we'll pre-fill year built, square footage, and key systems automatically.",
      },
    ],
  },
  {
    icon: CalendarCheck,
    title: "Maintenance Autopilot",
    description: "Seasonal task schedules and reminders.",
    faqs: [
      {
        q: "How does the maintenance schedule work?",
        a: "We generate a custom seasonal task list based on your home's systems (HVAC type, roof, pool, septic, etc.). You can mark tasks complete, snooze them, or get product recommendations.",
      },
      {
        q: "What's the difference between free and Pro maintenance?",
        a: "Free gives you the basic schedule. Pro adds advanced reminders, personalized product picks, and recurring task automation.",
      },
    ],
  },
  {
    icon: FileText,
    title: "Digital Home Binder",
    description: "Track appliances, warranties, and receipts.",
    faqs: [
      {
        q: "What can I store in the Home Binder?",
        a: "Appliances, HVAC equipment, water heaters, warranties, serial numbers, purchase receipts, and notes. You can attach documents too.",
      },
      {
        q: "How many items can I add?",
        a: "Free: 0 items. Home Hero: 5 items. Home Super Hero: unlimited items across all your homes.",
      },
    ],
  },
  {
    icon: Wrench,
    title: "AI Job Estimator",
    description: "Get cost estimates before you call a pro.",
    faqs: [
      {
        q: "How does the Estimator work?",
        a: "Upload a photo and describe the issue. Our AI returns an estimated cost range, time estimate, and a DIY-vs-Pro recommendation. Pro tier required.",
      },
      {
        q: "How accurate are the estimates?",
        a: "Estimates are based on national averages and your local market. Always confirm with a real bid from a pro before committing.",
      },
    ],
  },
  {
    icon: Shield,
    title: "Coverage Advisor",
    description: "Understand what your warranties and insurance cover.",
    faqs: [
      {
        q: "What does Coverage Advisor do?",
        a: "Upload your warranty or insurance documents and ask plain-English questions like 'is roof leak damage covered?' — the AI reads your docs and answers. Pro tier required.",
      },
      {
        q: "Are my documents private?",
        a: "Yes. Documents are stored privately and only accessible by you. They're never shared with providers or other users.",
      },
    ],
  },
  {
    icon: Search,
    title: "Finding & Messaging Pros",
    description: "Search for providers and start conversations.",
    faqs: [
      {
        q: "How do I find a pro?",
        a: "Go to 'Find Pros' in the navbar. Search by category and location. Click any provider to see details and send a message.",
      },
      {
        q: "Will pros see my phone number?",
        a: "No — not unless you explicitly approve it. All initial contact happens through in-app messaging to protect your privacy.",
      },
      {
        q: "What if a pro isn't on HomeHero yet?",
        a: "You can still message them — we'll notify them and invite them to join. Your message stays in your Pending Messages until they sign up.",
      },
    ],
  },
  {
    icon: Briefcase,
    title: "Posting Jobs & Bids",
    description: "Post a project and get bids from local pros.",
    faqs: [
      {
        q: "How do I post a job?",
        a: "Go to 'Jobs' in the navbar, click 'Post a Job', describe the work, and select a category and location. Pros in your area can then bid on it.",
      },
      {
        q: "How do I accept a bid?",
        a: "Open your job, review the bids, and click 'Accept' on the one you want. The pro is notified and you can continue the conversation in Messages.",
      },
    ],
  },
  {
    icon: MessageSquare,
    title: "Messages",
    description: "In-app chat with providers and HomeHero support.",
    faqs: [
      {
        q: "Where do support replies show up?",
        a: "All replies — including instant AI replies and human team responses — appear in your in-app Messages inbox.",
      },
      {
        q: "Can I block a provider?",
        a: "Yes. Open the conversation, click the menu, and select 'Block'. They can't message you or see your activity. You can unblock anytime.",
      },
    ],
  },
  {
    icon: Crown,
    title: "Subscriptions & Billing",
    description: "Plans, upgrades, and cancellations.",
    faqs: [
      {
        q: "What's included in each plan?",
        a: "Free: 1 home, basic maintenance, browse and message pros. Home Hero: full features (Estimator, Coverage Advisor, Binder up to 5 items). Home Super Hero: 10 homes, unlimited binder.",
      },
      {
        q: "How do I upgrade or cancel?",
        a: "Self-serve billing isn't live yet. Contact us via the Contact page and we'll handle upgrades or cancellations within 48 hours.",
      },
    ],
  },
];

const Help = () => {
  const [query, setQuery] = useState("");

  const filteredTopics = query.trim()
    ? TOPICS.map((t) => ({
        ...t,
        faqs: t.faqs.filter(
          (f) =>
            f.q.toLowerCase().includes(query.toLowerCase()) ||
            f.a.toLowerCase().includes(query.toLowerCase()) ||
            t.title.toLowerCase().includes(query.toLowerCase())
        ),
      })).filter((t) => t.faqs.length > 0)
    : TOPICS;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
              <HelpCircle className="w-7 h-7 text-primary" />
            </div>
            <h1 className="font-display text-4xl font-bold text-foreground mb-3">Help Center</h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Browse common questions or search the docs. Still stuck? Our AI replies instantly to most questions, and humans take the rest.
            </p>
          </div>

          <div className="relative max-w-xl mx-auto mb-10">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search help articles..."
              className="pl-10"
            />
          </div>

          {filteredTopics.length === 0 ? (
            <Card className="text-center">
              <CardContent className="pt-8 pb-8">
                <p className="text-muted-foreground mb-4">No articles match "{query}".</p>
                <Button asChild>
                  <Link to="/contact"><Mail className="w-4 h-4 mr-2" /> Contact us</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {filteredTopics.map((topic) => {
                const Icon = topic.icon;
                return (
                  <Card key={topic.title}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3 text-lg">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div>{topic.title}</div>
                          <p className="text-xs font-normal text-muted-foreground mt-0.5">{topic.description}</p>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Accordion type="single" collapsible className="w-full">
                        {topic.faqs.map((faq, idx) => (
                          <AccordionItem key={idx} value={`${topic.title}-${idx}`}>
                            <AccordionTrigger className="text-sm text-left">{faq.q}</AccordionTrigger>
                            <AccordionContent className="text-sm text-muted-foreground">{faq.a}</AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <Card className="mt-10 border-primary/20 bg-primary/5">
            <CardContent className="pt-6 flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
              <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">Still need help?</p>
                <p className="text-sm text-muted-foreground">
                  Send us a message — our AI answers common questions instantly, and humans reply within 48 hours.
                </p>
              </div>
              <Button asChild>
                <Link to="/contact">Contact Support</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Help;
