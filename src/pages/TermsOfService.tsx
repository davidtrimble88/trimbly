import { Link } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const TermsOfService = () => {
  const lastUpdated = "May 12, 2026";

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
                <li>Service providers are independent contractors, not employees, agents, or partners of HomeHero</li>
                <li>HomeHero does not perform, supervise, control, or guarantee any work performed by providers</li>
                <li>HomeHero does not verify, endorse, or warrant any provider's licenses, insurance, credentials, qualifications, background, or quality of work, even when such information is displayed on the platform</li>
                <li>Providers are solely responsible for the truthfulness of their profile information, including credentials and insurance</li>
                <li>All agreements, payments, scheduling, scope of work, warranties, and disputes for services are strictly between the homeowner and the provider</li>
                <li>HomeHero is not a party to any service contract and has no liability for the acts, omissions, negligence, fraud, property damage, personal injury, theft, delays, defects, or any other harm caused by or arising from a provider's services</li>
                <li>You are solely responsible for vetting any provider — including verifying licenses, insurance, references, and reviews — before engaging them</li>
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
                HomeHero uses artificial intelligence to generate maintenance schedules, cost estimates, symptom triage, repair guidance, product recommendations, and other content. <strong>All AI-generated content is provided "as is," for general informational purposes only, and may be inaccurate, incomplete, outdated, or unsafe for your specific situation.</strong>
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>AI output is not professional advice and is never a substitute for a licensed contractor, electrician, plumber, structural engineer, inspector, attorney, financial advisor, or other qualified professional</li>
                <li>Cost estimates, timelines, materials lists, and difficulty ratings are approximations and may differ substantially from real-world outcomes</li>
                <li>Maintenance schedules and reminders are suggestions based on generalized data and may not apply to your home, climate, equipment, code requirements, or warranty terms</li>
                <li>You are responsible for independently verifying any AI output before acting on it</li>
                <li>HomeHero disclaims all liability for any decision, action, repair, purchase, injury, damage, code violation, voided warranty, or loss resulting from reliance on AI-generated content</li>
              </ul>
            </section>

            <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-4">
              <h2 className="text-xl font-bold text-foreground">7. Do-It-Yourself (DIY) Work — Assumption of Risk</h2>
              <p className="text-muted-foreground leading-relaxed">
                HomeHero may provide DIY guidance, tutorials, project suggestions, parts lists, and step-by-step instructions. <strong>If you choose to perform any DIY work, you do so entirely at your own risk.</strong>
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Home repair, maintenance, electrical, plumbing, gas, roofing, structural, and similar work can cause serious injury, death, fire, flooding, electrocution, carbon monoxide poisoning, property damage, or environmental harm</li>
                <li>Many tasks legally require a licensed professional and/or permits in your jurisdiction — it is your responsibility to know and comply with all applicable laws, codes, and permit requirements</li>
                <li>DIY work may void manufacturer warranties, insurance coverage, or home warranties — HomeHero is not responsible for any such loss</li>
                <li>You expressly assume all risks associated with any DIY project, including risks not foreseeable at the time of the work</li>
                <li>You release, waive, and hold harmless HomeHero from any and all claims, damages, injuries, or losses — to yourself, your family, your property, your guests, or any third party — arising from DIY work informed by or undertaken through the platform</li>
                <li>When in doubt, stop and hire a qualified licensed professional</li>
              </ul>
            </section>

            <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-4">
              <h2 className="text-xl font-bold text-foreground">8. User Content & Reviews</h2>
              <p className="text-muted-foreground leading-relaxed">
                By posting reviews, comments, photos, job descriptions, or other content on HomeHero, you grant us a non-exclusive, worldwide, royalty-free, sublicensable license to use, display, reproduce, modify, and distribute that content on and in connection with our platform. You agree that:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Your content is accurate and reflects your genuine experience</li>
                <li>You will not post false, misleading, defamatory, infringing, or unlawful content</li>
                <li>You will not use the platform to harass, spam, or abuse others</li>
                <li>We reserve the right (but have no obligation) to remove content that violates these terms</li>
              </ul>
            </section>

            <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-4">
              <h2 className="text-xl font-bold text-foreground">9. Disclaimer of Warranties</h2>
              <p className="text-muted-foreground leading-relaxed">
                THE PLATFORM, ALL CONTENT, AND ALL SERVICES OFFERED THROUGH IT ARE PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. TO THE FULLEST EXTENT PERMITTED BY LAW, HOMEHERO DISCLAIMS ALL WARRANTIES, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, ACCURACY, RELIABILITY, AVAILABILITY, AND SECURITY. We do not warrant that the platform will be uninterrupted, error-free, or free of harmful components, or that any content, AI output, or provider information will be accurate or complete.
              </p>
            </section>

            <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-4">
              <h2 className="text-xl font-bold text-foreground">10. Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                TO THE FULLEST EXTENT PERMITTED BY LAW, IN NO EVENT SHALL HOMEHERO, ITS AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, LICENSORS, OR SUPPLIERS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES — INCLUDING WITHOUT LIMITATION DAMAGES FOR PERSONAL INJURY, DEATH, PROPERTY DAMAGE, LOSS OF PROFITS, LOSS OF DATA, LOSS OF GOODWILL, BUSINESS INTERRUPTION, OR COST OF SUBSTITUTE SERVICES — ARISING OUT OF OR RELATED TO (A) YOUR USE OF OR INABILITY TO USE THE PLATFORM, (B) ANY SERVICES PERFORMED OR NOT PERFORMED BY A PROVIDER, (C) ANY AI-GENERATED CONTENT, (D) ANY DIY WORK, (E) ANY THIRD-PARTY CONTENT, PRODUCTS, OR LINKS, OR (F) UNAUTHORIZED ACCESS TO YOUR ACCOUNT — WHETHER BASED ON CONTRACT, TORT, STRICT LIABILITY, OR ANY OTHER LEGAL THEORY, EVEN IF HOMEHERO HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                IN NO EVENT SHALL HOMEHERO'S AGGREGATE LIABILITY TO YOU FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THESE TERMS OR THE PLATFORM EXCEED THE GREATER OF (I) THE TOTAL AMOUNT YOU PAID TO HOMEHERO IN THE TWELVE (12) MONTHS PRECEDING THE EVENT GIVING RISE TO THE CLAIM, OR (II) ONE HUNDRED U.S. DOLLARS ($100). Some jurisdictions do not allow certain limitations, so portions of this section may not apply to you.
              </p>
            </section>

            <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-4">
              <h2 className="text-xl font-bold text-foreground">11. Indemnification</h2>
              <p className="text-muted-foreground leading-relaxed">
                You agree to defend, indemnify, and hold harmless HomeHero and its affiliates, officers, directors, employees, and agents from and against any and all claims, damages, obligations, losses, liabilities, costs, and expenses (including reasonable attorneys' fees) arising from: (a) your use of the platform; (b) your violation of these Terms; (c) your violation of any law or third-party right, including any intellectual property or privacy right; (d) any content you submit; (e) any service you provide as a provider or receive as a homeowner; (f) any DIY project you undertake; and (g) your reliance on AI-generated content.
              </p>
            </section>

            <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-4">
              <h2 className="text-xl font-bold text-foreground">12. Assumption of Risk & Release</h2>
              <p className="text-muted-foreground leading-relaxed">
                You acknowledge that home maintenance, repair, and improvement activities — whether performed by you or by a third-party provider — carry inherent risks of property damage, personal injury, and death. You knowingly and voluntarily assume all such risks. You release HomeHero from any claim, demand, or cause of action arising from such risks, to the maximum extent permitted by law.
              </p>
            </section>

            <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-4">
              <h2 className="text-xl font-bold text-foreground">13. No Professional Advice</h2>
              <p className="text-muted-foreground leading-relaxed">
                Nothing on the platform constitutes legal, financial, insurance, medical, structural, or other professional advice. You should consult appropriately licensed professionals before making decisions based on platform content.
              </p>
            </section>

            <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-4">
              <h2 className="text-xl font-bold text-foreground">14. Dispute Resolution & Binding Arbitration</h2>
              <p className="text-muted-foreground leading-relaxed">
                Any dispute, claim, or controversy arising out of or relating to these Terms or the platform shall be resolved through final and binding individual arbitration, rather than in court, except that you may assert claims in small-claims court if your claims qualify. <strong>You and HomeHero waive any right to a jury trial and to participate in a class action, class arbitration, or representative proceeding.</strong> Arbitration shall be administered under the rules of a recognized arbitration body in the United States, and judgment on the award may be entered in any court of competent jurisdiction.
              </p>
            </section>

            <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-4">
              <h2 className="text-xl font-bold text-foreground">15. Governing Law</h2>
              <p className="text-muted-foreground leading-relaxed">
                These Terms are governed by the laws of the United States and the State in which HomeHero is headquartered, without regard to conflict-of-laws principles. Subject to Section 14, the exclusive venue for any non-arbitrable dispute shall be the state and federal courts located in that State.
              </p>
            </section>

            <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-4">
              <h2 className="text-xl font-bold text-foreground">16. Termination</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to suspend or terminate your account at any time for violation of these terms. You may also delete your account at any time. Upon termination, your right to use the platform ceases immediately, though Sections 4–15 and 17 will survive.
              </p>
            </section>

            <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-4">
              <h2 className="text-xl font-bold text-foreground">17. Changes to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may modify these Terms of Service at any time. Material changes will be communicated via email or a notice on the platform. Continued use of the service after changes constitutes acceptance of the updated terms.
              </p>
            </section>

            <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-4">
              <h2 className="text-xl font-bold text-foreground">18. Severability</h2>
              <p className="text-muted-foreground leading-relaxed">
                If any provision of these Terms is held invalid or unenforceable, the remaining provisions shall continue in full force and effect, and the invalid provision shall be modified to the minimum extent necessary to make it enforceable.
              </p>
            </section>

            <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-4">
              <h2 className="text-xl font-bold text-foreground">19. Acknowledgment</h2>
              <p className="text-muted-foreground leading-relaxed">
                BY CREATING AN ACCOUNT OR USING THE PLATFORM, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THESE TERMS — INCLUDING THE LIMITATIONS OF LIABILITY, ASSUMPTION OF RISK, INDEMNIFICATION, AND BINDING ARBITRATION PROVISIONS.
              </p>
            </section>

            <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-4">
              <h2 className="text-xl font-bold text-foreground">11. Contact</h2>
              <p className="text-muted-foreground leading-relaxed">
                For questions about these Terms of Service, please{" "}
                <Link to="/contact" className="text-primary hover:underline font-medium">
                  contact us
                </Link>
                .
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
