import { Link } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const PrivacyPolicy = () => {
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
              <Shield size={22} className="text-primary" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-foreground font-display">Privacy Policy</h1>
              <p className="text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
            </div>
          </div>

          <div className="prose prose-sm max-w-none space-y-8">
            <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-4">
              <h2 className="text-xl font-bold text-foreground">1. Introduction</h2>
              <p className="text-muted-foreground leading-relaxed">
                HomeHero ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services.
              </p>
            </section>

            <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-4">
              <h2 className="text-xl font-bold text-foreground">2. Information We Collect</h2>
              <h3 className="text-base font-semibold text-foreground">Personal Information</h3>
              <p className="text-muted-foreground leading-relaxed">
                When you create an account, we may collect your name, email address, and authentication credentials. Service providers may also provide business name, phone number, location, and professional credentials.
              </p>
              <h3 className="text-base font-semibold text-foreground">Home Information</h3>
              <p className="text-muted-foreground leading-relaxed">
                To provide personalized maintenance schedules, we collect information about your home including type, location, age, systems, and features. This data is used solely to improve your experience.
              </p>
              <h3 className="text-base font-semibold text-foreground">Usage Data</h3>
              <p className="text-muted-foreground leading-relaxed">
                We automatically collect information about how you interact with our platform, including pages visited, features used, and device information.
              </p>
            </section>

            <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-4">
              <h2 className="text-xl font-bold text-foreground">3. How We Use Your Information</h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Provide and maintain our services</li>
                <li>Generate personalized maintenance schedules</li>
                <li>Send maintenance reminders and notifications</li>
                <li>Connect homeowners with service providers</li>
                <li>Process transactions and manage subscriptions</li>
                <li>Improve our platform and develop new features</li>
                <li>Communicate with you about updates and promotions</li>
              </ul>
            </section>

            <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-4">
              <h2 className="text-xl font-bold text-foreground">4. Information Sharing</h2>
              <p className="text-muted-foreground leading-relaxed">
                We do not sell your personal information. We may share your information with:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li><strong>Service providers</strong> you choose to connect with through our platform</li>
                <li><strong>Third-party services</strong> that help us operate our platform (e.g., payment processing, email delivery)</li>
                <li><strong>Legal authorities</strong> when required by law or to protect our rights</li>
              </ul>
            </section>

            <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-4">
              <h2 className="text-xl font-bold text-foreground">5. Data Security</h2>
              <p className="text-muted-foreground leading-relaxed">
                We implement industry-standard security measures to protect your data, including encryption in transit and at rest, secure authentication, and row-level security policies on our database. However, no method of transmission over the internet is 100% secure.
              </p>
            </section>

            <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-4">
              <h2 className="text-xl font-bold text-foreground">6. Your Rights</h2>
              <p className="text-muted-foreground leading-relaxed">You have the right to:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Access the personal data we hold about you</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your account and associated data</li>
                <li>Opt out of marketing communications</li>
                <li>Export your data in a portable format</li>
              </ul>
            </section>

            <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-4">
              <h2 className="text-xl font-bold text-foreground">7. Cookies</h2>
              <p className="text-muted-foreground leading-relaxed">
                We use essential cookies to maintain your session and preferences. We do not use third-party tracking cookies for advertising purposes.
              </p>
            </section>

            <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-4">
              <h2 className="text-xl font-bold text-foreground">8. Changes to This Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date.
              </p>
            </section>

            <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-4">
              <h2 className="text-xl font-bold text-foreground">9. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have questions about this Privacy Policy, please contact us through our platform or email us at privacy@homehero.com.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
