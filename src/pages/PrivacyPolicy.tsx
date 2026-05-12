import { Link } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const PrivacyPolicy = () => {
  const lastUpdated = "May 12, 2026";

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-4">
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
      <div className="space-y-3 text-muted-foreground leading-relaxed">{children}</div>
    </section>
  );

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
            <Section title="1. Introduction">
              <p>
                HomeHero ("we," "our," or "us") operates the HomeHero website and mobile application (collectively, the "Platform"). This Privacy Policy describes how we collect, use, share, and protect personal information about you, and the rights and choices available to you. This policy applies to homeowners, service providers ("Pros"), and visitors, and covers both our website and our iOS and Android apps.
              </p>
              <p>
                By using the Platform, you consent to the practices described in this Policy. If you do not agree, please do not use the Platform.
              </p>
            </Section>

            <Section title="2. Information We Collect">
              <h3 className="text-base font-semibold text-foreground">a. Information you provide</h3>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>Account data:</strong> name, email, password (hashed), phone (optional), role (homeowner or Pro), and profile photo.</li>
                <li><strong>Pro business data:</strong> business name, service categories, service area, hours, license/insurance details, hourly or job pricing, portfolio photos.</li>
                <li><strong>Home data:</strong> address, ZIP code, home type, age, square footage, systems (HVAC, water heater, roof, etc.), warranties, and uploaded documents.</li>
                <li><strong>Project & messaging data:</strong> job posts, photos, descriptions, bids, in-app messages, reviews, and ratings.</li>
                <li><strong>Payment data:</strong> processed by our payment partner (e.g., Stripe). We never see or store full card numbers — only a token and the last 4 digits.</li>
                <li><strong>Support communications:</strong> when you email or message support.</li>
              </ul>
              <h3 className="text-base font-semibold text-foreground">b. Information collected automatically</h3>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>Device & log data:</strong> IP address, browser/OS, device model, app version, crash logs, time stamps, and pages viewed.</li>
                <li><strong>Usage data:</strong> features used, clicks, search queries, and referring URLs.</li>
                <li><strong>Cookies and similar technologies:</strong> see Section 9.</li>
                <li><strong>Approximate location:</strong> derived from IP or, with permission, your device's location services, to match you with nearby Pros.</li>
                <li><strong>Push tokens:</strong> if you enable notifications on the mobile app.</li>
              </ul>
              <h3 className="text-base font-semibold text-foreground">c. Information from third parties</h3>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>Auth providers</strong> (Google, Apple) — name, email, and profile image you authorize.</li>
                <li><strong>Public property data</strong> (e.g., Zillow-style data sources) — to pre-fill home characteristics, with your permission.</li>
                <li><strong>Background-check or licensing data</strong> — if a Pro consents to verification.</li>
              </ul>
            </Section>

            <Section title="3. Mobile App Permissions">
              <p>Our iOS and Android apps may ask for the following permissions. You can revoke any permission at any time in your device settings.</p>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>Camera & Photos:</strong> to upload job photos, home binder documents, and profile pictures.</li>
                <li><strong>Location (when in use):</strong> to find nearby Pros and pre-fill your service area.</li>
                <li><strong>Push notifications:</strong> for new messages, bids, maintenance reminders, and job updates.</li>
                <li><strong>Microphone (optional):</strong> only when you intentionally record a voice description for a job.</li>
                <li><strong>Files / Storage:</strong> to attach receipts, warranties, and documents to your home binder.</li>
              </ul>
              <p>
                We do <strong>not</strong> use Apple's App Tracking Transparency framework to track you across other apps or websites for advertising. We do not access contacts, calendar, health data, biometrics, or background location.
              </p>
            </Section>

            <Section title="4. How We Use Information">
              <ul className="list-disc list-inside space-y-2">
                <li>Provide, operate, and maintain the Platform and your account.</li>
                <li>Generate personalized maintenance schedules, AI cost estimates, and DIY guidance.</li>
                <li>Match homeowners with Pros and facilitate messaging, bidding, and reviews.</li>
                <li>Send transactional emails, push notifications, and SMS (if you opt in) about your account, jobs, messages, and reminders.</li>
                <li>Process subscription payments and prevent fraud.</li>
                <li>Improve, debug, and secure the Platform (including aggregated analytics).</li>
                <li>Comply with legal obligations and enforce our Terms.</li>
                <li>With your consent, send marketing or product update emails (you may opt out anytime).</li>
              </ul>
            </Section>

            <Section title="5. Legal Bases (EEA / UK Users)">
              <p>If you are in the European Economic Area, United Kingdom, or Switzerland, we rely on the following legal bases under GDPR:</p>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>Contract</strong> — to provide the services you request.</li>
                <li><strong>Legitimate interests</strong> — to secure the Platform, prevent fraud, and improve our product.</li>
                <li><strong>Consent</strong> — for marketing, optional cookies, location, and push notifications. You may withdraw consent anytime.</li>
                <li><strong>Legal obligation</strong> — to comply with applicable laws.</li>
              </ul>
            </Section>

            <Section title="6. How We Share Information">
              <p>We do <strong>not sell</strong> your personal information and we do <strong>not share</strong> it for cross-context behavioral advertising.</p>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>Other users:</strong> Pros see relevant job details and messages you send them; homeowners see Pro profiles, ratings, and reviews. Names, photos, reviews, and city-level location may be displayed publicly.</li>
                <li><strong>Service providers (vendors) who process data for us:</strong> cloud hosting and database (Supabase), payments (Stripe and/or Paddle), AI inference (Lovable AI Gateway, which routes to Google Gemini and OpenAI), web data extraction (Firecrawl), product affiliate links (Amazon), email/SMS delivery, push notifications (Apple APNs, Google FCM), and crash/analytics tools. These vendors are bound by contracts limiting their use of your data.</li>
                <li><strong>Legal & safety:</strong> to comply with law, valid legal process, or to protect rights, safety, or property.</li>
                <li><strong>Business transfers:</strong> in connection with a merger, acquisition, or asset sale, with notice to you.</li>
                <li><strong>With your consent</strong> for any other purpose.</li>
              </ul>
            </Section>

            <Section title="7. AI Processing">
              <p>
                When you use AI features (maintenance autopilot, job estimator, coverage advisor, etc.), relevant input (your prompt, job description, uploaded document text, or home details) is sent to our AI providers solely to generate a response for you. Per our agreements with these providers, your data is <strong>not used to train their models</strong>. AI output is generated content and may be inaccurate — see our Terms of Service for the full disclaimer.
              </p>
            </Section>

            <Section title="8. Data Retention">
              <ul className="list-disc list-inside space-y-2">
                <li><strong>Account data:</strong> retained while your account is active and for up to 90 days after deletion (to recover from accidental deletion and meet legal obligations).</li>
                <li><strong>Jobs, messages, and reviews:</strong> retained for up to 7 years for tax, dispute-resolution, and trust-and-safety purposes.</li>
                <li><strong>Payment records:</strong> retained as required by tax and accounting laws (typically 7 years).</li>
                <li><strong>Backups:</strong> rolling encrypted backups are purged within 90 days.</li>
                <li><strong>Aggregated/anonymized data</strong> may be retained indefinitely.</li>
              </ul>
            </Section>

            <Section title="9. Cookies & Similar Technologies">
              <p>We use:</p>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>Strictly necessary cookies</strong> — to keep you signed in and remember preferences.</li>
                <li><strong>Functional storage</strong> — to remember UI choices (e.g., dismissed banners).</li>
                <li><strong>Analytics</strong> — anonymous usage statistics to improve the product.</li>
              </ul>
              <p>We do not use third-party advertising or cross-site tracking cookies. You can clear cookies in your browser at any time. We honor Global Privacy Control (GPC) signals as a valid opt-out where applicable.</p>
            </Section>

            <Section title="10. Your Rights & Choices">
              <p>Depending on where you live, you may have the right to:</p>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>Access</strong> — request a copy of the personal data we hold about you.</li>
                <li><strong>Correct</strong> — update inaccurate or incomplete data.</li>
                <li><strong>Delete</strong> — request deletion of your account and personal data.</li>
                <li><strong>Port</strong> — receive your data in a portable, machine-readable format.</li>
                <li><strong>Object / Restrict</strong> — object to or restrict certain processing.</li>
                <li><strong>Withdraw consent</strong> — at any time, without affecting prior processing.</li>
                <li><strong>Non-discrimination</strong> — we will not deny service or charge different prices for exercising your rights.</li>
              </ul>
              <p>
                To exercise these rights, email <strong>privacy@homehero.com</strong> from the address on your account, or use the in-app data tools in Settings. We will verify your identity and respond within the time required by applicable law (typically 30–45 days).
              </p>
              <h3 className="text-base font-semibold text-foreground">California (CCPA / CPRA) Notice</h3>
              <p>
                California residents have the rights above plus the right to know what categories of personal information we collect, the right to opt out of "sale" or "sharing" (we do neither), and the right to limit use of sensitive personal information. We do not knowingly process the sensitive personal information of California residents beyond what is necessary to provide the service.
              </p>
              <h3 className="text-base font-semibold text-foreground">EU / UK Users</h3>
              <p>
                You have the right to lodge a complaint with your local data protection authority. If you require a copy of standard contractual clauses for international transfers, contact us.
              </p>
            </Section>

            <Section title="11. International Data Transfers">
              <p>
                We are based in the United States and our service providers are located in the United States and other countries. When you use the Platform, your information may be transferred to and processed in countries whose data-protection laws may differ from yours. Where required, we rely on Standard Contractual Clauses or other legally recognized safeguards.
              </p>
            </Section>

            <Section title="12. Children's Privacy">
              <p>
                The Platform is intended for users <strong>18 years of age or older</strong>. We do not knowingly collect personal information from children under 13 (or under 16 in the EEA/UK). If you believe a child has provided us with personal information, contact us at <strong>privacy@homehero.com</strong> and we will delete it.
              </p>
            </Section>

            <Section title="13. Security">
              <p>
                We implement industry-standard administrative, technical, and physical safeguards, including encryption in transit (TLS) and at rest, hashed passwords, row-level security on our database, signed URLs for file access, and least-privilege access controls for staff. However, no system is 100% secure. In the event of a personal data breach that creates a risk to your rights, we will notify you and applicable regulators as required by law.
              </p>
            </Section>

            <Section title="14. Communications">
              <p>
                <strong>Transactional</strong> emails, push notifications, and (where you provide a number) SMS messages about your account, jobs, bids, messages, and maintenance reminders are part of the service and cannot be disabled without losing functionality, though you can mute most categories in Settings.{" "}
                <strong>Marketing</strong> messages are opt-in (or opt-out where permitted) — every marketing email has an unsubscribe link, and you can reply STOP to any marketing SMS.
              </p>
            </Section>

            <Section title="15. Third-Party Links">
              <p>
                The Platform may link to third-party websites (e.g., Amazon for product recommendations). We are not responsible for the privacy practices of those sites. Review their policies before providing personal information.
              </p>
            </Section>

            <Section title="16. Do Not Track">
              <p>
                Some browsers send a "Do Not Track" signal. Because there is no industry-standard interpretation, we do not respond to DNT signals at this time. We do honor Global Privacy Control (GPC) signals where applicable.
              </p>
            </Section>

            <Section title="17. Changes to This Policy">
              <p>
                We may update this Policy from time to time. Material changes will be communicated via email or a prominent in-app notice. The "Last updated" date above always reflects the current version.
              </p>
            </Section>

            <Section title="18. Contact Us">
              <p>
                Questions, requests, or complaints? Email <strong>privacy@homehero.com</strong> or write to us through our{" "}
                <Link to="/contact" className="text-primary hover:underline font-medium">contact page</Link>.
              </p>
            </Section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
