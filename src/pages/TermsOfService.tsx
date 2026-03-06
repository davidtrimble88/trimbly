import { Link } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const TermsOfService = () => {
  const lastUpdated = "March 6, 2026";

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ArrowLeft size={16} /> Back to home
          </Link>

          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText size={22} className="text-primary" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-foreground font-display">Terms of Service</h1>
              <p className="text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
            </div>
          </div>

          <div className="prose prose-sm max-w-none space-y-8">
            <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-4">
              <h2 className="text-xl font-bold text-foreground">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing or using HomeHero ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
              </p>
            </section>

            <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-4">
              <h2 className="text-xl font-bold text-foreground">2. Description of Service</h2>
              <p className="text-muted-foreground leading-relaxed">
                HomeHero is an AI-powered home management platform that provides personalized maintenance scheduling, a digital home binder for tracking home systems and documents, and a marketplace connecting homeowners with local service providers.
              </p>
            </section>

            <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-4">
              <h2 className="text-xl font-bold text-foreground">3. User Accounts</h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>You must provide accurate and complete information when creating an account</li>
                <li>You are responsible for maintaining the security of your account credentials</li>
                <li>You must be at least 18 years old to create an account</li>
                <li>One person may not maintain more than one free account</li>
                <li>You are responsible for all activity that occurs under your account</li>
              </ul>
            </section>

            <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-4">
              <h2 className="text-xl font-bold text-foreground">4. Service Providers</h2>
              <p className="text-muted-foreground leading-relaxed">
                HomeHero acts as a marketplace connecting homeowners with independent service providers. We do not employ, endorse, or guarantee any service provider listed on our platform.
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Service providers are independent contractors, not employees of HomeHero</li>
                <li>HomeHero is not responsible for the quality, safety, or legality of services performed</li>
                <li>Providers are responsible for maintaining accurate and truthful profile information</li>
                <li>All agreements for services are between the homeowner and the provider</li>
              </ul>
            </section>

            <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-4">
              <h2 className="text-xl font-bold text-foreground">5. Subscriptions & Payments</h2>
              <p className="text-muted-foreground leading-relaxed">
                Certain features require a paid subscription. By subscribing, you agree to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Pay the applicable fees as described at the time of purchase</li>
                <li>Automatic renewal unless canceled before the next billing cycle</li>
                <li>Provide valid payment information</li>
                <li>Price changes will be communicated with at least 30 days' notice</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed">
                Refunds are available within 14 days of initial purchase. No refunds are provided for partial billing periods after cancellation.
              </p>
            </section>

            <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-4">
              <h2 className="text-xl font-bold text-foreground">6. AI-Generated Content</h2>
              <p className="text-muted-foreground leading-relaxed">
                HomeHero uses artificial intelligence to generate maintenance schedules, cost estimates, and recommendations. This content is provided for informational purposes only.
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>AI-generated recommendations are not a substitute for professional advice</li>
                <li>Cost estimates are approximate and may vary from actual costs</li>
                <li>Maintenance schedules are suggestions based on general best practices</li>
                <li>Always consult a qualified professional for critical home repairs or safety concerns</li>
              </ul>
            </section>

            <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-4">
              <h2 className="text-xl font-bold text-foreground">7. User Content & Reviews</h2>
              <p className="text-muted-foreground leading-relaxed">
                By posting reviews, comments, or other content on HomeHero, you grant us a non-exclusive, royalty-free license to use, display, and distribute that content on our platform. You agree that:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Your content is accurate and reflects your genuine experience</li>
                <li>You will not post false, misleading, or defamatory content</li>
                <li>You will not use the platform to harass, spam, or abuse others</li>
                <li>We reserve the right to remove content that violates these terms</li>
              </ul>
            </section>

            <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-4">
              <h2 className="text-xl font-bold text-foreground">8. Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                To the fullest extent permitted by law, HomeHero shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or use, arising from your use of the platform or services obtained through it.
              </p>
            </section>

            <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-4">
              <h2 className="text-xl font-bold text-foreground">9. Termination</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to suspend or terminate your account at any time for violation of these terms. You may also delete your account at any time. Upon termination, your right to use the platform ceases immediately, though certain provisions of these terms will survive.
              </p>
            </section>

            <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-4">
              <h2 className="text-xl font-bold text-foreground">10. Changes to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may modify these Terms of Service at any time. Material changes will be communicated via email or a notice on the platform. Continued use of the service after changes constitutes acceptance of the updated terms.
              </p>
            </section>

            <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-4">
              <h2 className="text-xl font-bold text-foreground">11. Contact</h2>
              <p className="text-muted-foreground leading-relaxed">
                For questions about these Terms of Service, please contact us at legal@homehero.com.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TermsOfService;
