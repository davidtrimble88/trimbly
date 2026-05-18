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
                By accessing or using Trimbly ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
              </p>
            </section>

            <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-4">
              <h2 className="text-xl font-bold text-foreground">2. Description of Service</h2>
              <p className="text-muted-foreground leading-relaxed">
                Trimbly is an AI-powered home management platform that provides personalized maintenance scheduling, a digital home binder for tracking home systems and documents, and a marketplace connecting homeowners with local service providers.
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
                Trimbly acts as a marketplace connecting homeowners with independent service providers. We do not employ, endorse, or guarantee any service provider listed on our platform.
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Service providers are independent contractors, not employees, agents, or partners of Trimbly</li>
                <li>Trimbly does not perform, supervise, control, or guarantee any work performed by providers</li>
                <li>Trimbly does not verify, endorse, or warrant any provider's licenses, insurance, credentials, qualifications, background, or quality of work, even when such information is displayed on the platform</li>
                <li>Providers are solely responsible for the truthfulness of their profile information, including credentials and insurance</li>
                <li>All agreements, payments, scheduling, scope of work, warranties, and disputes for services are strictly between the homeowner and the provider</li>
                <li>Trimbly is not a party to any service contract and has no liability for the acts, omissions, negligence, fraud, property damage, personal injury, theft, delays, defects, or any other harm caused by or arising from a provider's services</li>
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
                Trimbly uses artificial intelligence to generate maintenance schedules, cost estimates, symptom triage, repair guidance, product recommendations, and other content. <strong>All AI-generated content is provided "as is," for general informational purposes only, and may be inaccurate, incomplete, outdated, or unsafe for your specific situation.</strong>
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>AI output is not professional advice and is never a substitute for a licensed contractor, electrician, plumber, structural engineer, inspector, attorney, financial advisor, or other qualified professional</li>
                <li>Cost estimates, timelines, materials lists, and difficulty ratings are approximations and may differ substantially from real-world outcomes</li>
                <li>Maintenance schedules and reminders are suggestions based on generalized data and may not apply to your home, climate, equipment, code requirements, or warranty terms</li>
                <li>You are responsible for independently verifying any AI output before acting on it</li>
                <li>Trimbly disclaims all liability for any decision, action, repair, purchase, injury, damage, code violation, voided warranty, or loss resulting from reliance on AI-generated content</li>
              </ul>
            </section>

            <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-4">
              <h2 className="text-xl font-bold text-foreground">7. Do-It-Yourself (DIY) Work — Assumption of Risk</h2>
              <p className="text-muted-foreground leading-relaxed">
                Trimbly may provide DIY guidance, tutorials, project suggestions, parts lists, and step-by-step instructions. <strong>If you choose to perform any DIY work, you do so entirely at your own risk.</strong>
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Home repair, maintenance, electrical, plumbing, gas, roofing, structural, and similar work can cause serious injury, death, fire, flooding, electrocution, carbon monoxide poisoning, property damage, or environmental harm</li>
                <li>Many tasks legally require a licensed professional and/or permits in your jurisdiction — it is your responsibility to know and comply with all applicable laws, codes, and permit requirements</li>
                <li>DIY work may void manufacturer warranties, insurance coverage, or home warranties — Trimbly is not responsible for any such loss</li>
                <li>You expressly assume all risks associated with any DIY project, including risks not foreseeable at the time of the work</li>
                <li>You release, waive, and hold harmless Trimbly from any and all claims, damages, injuries, or losses — to yourself, your family, your property, your guests, or any third party — arising from DIY work informed by or undertaken through the platform</li>
                <li>When in doubt, stop and hire a qualified licensed professional</li>
              </ul>
            </section>

            <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-4">
              <h2 className="text-xl font-bold text-foreground">8. User Content & Reviews</h2>
              <p className="text-muted-foreground leading-relaxed">
                By posting reviews, comments, photos, job descriptions, or other content on Trimbly, you grant us a non-exclusive, worldwide, royalty-free, sublicensable license to use, display, reproduce, modify, and distribute that content on and in connection with our platform. You agree that:
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
                THE PLATFORM, ALL CONTENT, AND ALL SERVICES OFFERED THROUGH IT ARE PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. TO THE FULLEST EXTENT PERMITTED BY LAW, TRIMBLY DISCLAIMS ALL WARRANTIES, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, ACCURACY, RELIABILITY, AVAILABILITY, AND SECURITY. We do not warrant that the platform will be uninterrupted, error-free, or free of harmful components, or that any content, AI output, or provider information will be accurate or complete.
              </p>
            </section>

            <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-4">
              <h2 className="text-xl font-bold text-foreground">10. Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                TO THE FULLEST EXTENT PERMITTED BY LAW, IN NO EVENT SHALL TRIMBLY, ITS AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, LICENSORS, OR SUPPLIERS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES — INCLUDING WITHOUT LIMITATION DAMAGES FOR PERSONAL INJURY, DEATH, PROPERTY DAMAGE, LOSS OF PROFITS, LOSS OF DATA, LOSS OF GOODWILL, BUSINESS INTERRUPTION, OR COST OF SUBSTITUTE SERVICES — ARISING OUT OF OR RELATED TO (A) YOUR USE OF OR INABILITY TO USE THE PLATFORM, (B) ANY SERVICES PERFORMED OR NOT PERFORMED BY A PROVIDER, (C) ANY AI-GENERATED CONTENT, (D) ANY DIY WORK, (E) ANY THIRD-PARTY CONTENT, PRODUCTS, OR LINKS, OR (F) UNAUTHORIZED ACCESS TO YOUR ACCOUNT — WHETHER BASED ON CONTRACT, TORT, STRICT LIABILITY, OR ANY OTHER LEGAL THEORY, EVEN IF TRIMBLY HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                IN NO EVENT SHALL TRIMBLY'S AGGREGATE LIABILITY TO YOU FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THESE TERMS OR THE PLATFORM EXCEED THE GREATER OF (I) THE TOTAL AMOUNT YOU PAID TO TRIMBLY IN THE TWELVE (12) MONTHS PRECEDING THE EVENT GIVING RISE TO THE CLAIM, OR (II) ONE HUNDRED U.S. DOLLARS ($100). Some jurisdictions do not allow certain limitations, so portions of this section may not apply to you.
              </p>
            </section>

            <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-4">
              <h2 className="text-xl font-bold text-foreground">11. Indemnification</h2>
              <p className="text-muted-foreground leading-relaxed">
                You agree to defend, indemnify, and hold harmless Trimbly and its affiliates, officers, directors, employees, and agents from and against any and all claims, damages, obligations, losses, liabilities, costs, and expenses (including reasonable attorneys' fees) arising from: (a) your use of the platform; (b) your violation of these Terms; (c) your violation of any law or third-party right, including any intellectual property or privacy right; (d) any content you submit; (e) any service you provide as a provider or receive as a homeowner; (f) any DIY project you undertake; and (g) your reliance on AI-generated content.
              </p>
            </section>

            <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-4">
              <h2 className="text-xl font-bold text-foreground">12. Assumption of Risk & Release</h2>
              <p className="text-muted-foreground leading-relaxed">
                You acknowledge that home maintenance, repair, and improvement activities — whether performed by you or by a third-party provider — carry inherent risks of property damage, personal injury, and death. You knowingly and voluntarily assume all such risks. You release Trimbly from any claim, demand, or cause of action arising from such risks, to the maximum extent permitted by law.
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
                Any dispute, claim, or controversy arising out of or relating to these Terms or the platform shall be resolved through final and binding individual arbitration, rather than in court, except that you may assert claims in small-claims court if your claims qualify. <strong>You and Trimbly waive any right to a jury trial and to participate in a class action, class arbitration, or representative proceeding.</strong> Arbitration shall be administered under the rules of a recognized arbitration body in the United States, and judgment on the award may be entered in any court of competent jurisdiction.
              </p>
            </section>

            <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-4">
              <h2 className="text-xl font-bold text-foreground">15. Governing Law</h2>
              <p className="text-muted-foreground leading-relaxed">
                These Terms are governed by the laws of the United States and the State in which Trimbly is headquartered, without regard to conflict-of-laws principles. Subject to Section 14, the exclusive venue for any non-arbitrable dispute shall be the state and federal courts located in that State.
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
              <h2 className="text-xl font-bold text-foreground">20. Mobile App License</h2>
              <p className="text-muted-foreground leading-relaxed">
                Subject to your compliance with these Terms, Trimbly grants you a limited, non-exclusive, non-transferable, non-sublicensable, revocable license to install and use one copy of the Trimbly mobile application on a device that you own or control, solely for your personal, non-commercial use (or, for Pros, internal business use). You may not copy, modify, decompile, reverse engineer, lease, sell, sublicense, or create derivative works of the app, except to the extent expressly permitted by law.
              </p>
            </section>

            <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-4">
              <h2 className="text-xl font-bold text-foreground">21. Apple App Store Addendum</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you download the Trimbly app from the Apple App Store, the following terms apply in addition to the rest of these Terms:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>These Terms are between you and Trimbly only, and not with Apple Inc. ("Apple"). Trimbly, not Apple, is solely responsible for the app and its content.</li>
                <li>Your license to use the app is limited to use on Apple-branded products that you own or control and as permitted by the Apple Media Services Terms.</li>
                <li>Apple has no obligation to provide any maintenance or support services for the app.</li>
                <li>In the event of any failure of the app to conform to any applicable warranty, you may notify Apple, and Apple will refund the purchase price (if any) for the app to you. To the maximum extent permitted by applicable law, Apple has no other warranty obligation whatsoever with respect to the app.</li>
                <li>Trimbly, not Apple, is responsible for addressing any claims by you or any third party relating to the app, including product liability claims, claims that the app fails to conform to any applicable legal or regulatory requirement, and claims arising under consumer-protection or similar legislation.</li>
                <li>In the event of any third-party claim that the app or your possession and use of the app infringes that third party's intellectual property rights, Trimbly, not Apple, is solely responsible for the investigation, defense, settlement, and discharge of that claim.</li>
                <li>You represent and warrant that you are not located in a country that is subject to a U.S. Government embargo or designated as a "terrorist supporting" country, and that you are not listed on any U.S. Government list of prohibited or restricted parties.</li>
                <li>Apple and Apple's subsidiaries are third-party beneficiaries of these Terms, and upon your acceptance of these Terms, Apple will have the right (and will be deemed to have accepted the right) to enforce these Terms against you as a third-party beneficiary.</li>
              </ul>
            </section>

            <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-4">
              <h2 className="text-xl font-bold text-foreground">22. Google Play Addendum</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you download the Trimbly app from Google Play, you acknowledge that these Terms are between you and Trimbly only, and not with Google LLC. Your use of the app must also comply with the Google Play Terms of Service. Trimbly — not Google — is solely responsible for the app, its content, and any claims related to it. Google has no obligation to provide support or maintenance for the app.
              </p>
            </section>

            <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-4">
              <h2 className="text-xl font-bold text-foreground">23. Subscription Auto-Renewal Disclosure</h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Paid subscriptions are <strong>automatically renewed</strong> at the end of each billing period (monthly or annual) using the payment method on file.</li>
                <li>The renewal price equals the then-current published price for your tier; we will give at least 30 days' notice of any price change.</li>
                <li>You can cancel at any time before the next renewal in Settings → Billing (or, for App Store purchases, in your Apple ID subscription settings; for Google Play purchases, in your Google Play account).</li>
                <li>Cancellation takes effect at the end of the current paid period; access continues until then.</li>
                <li>For App Store and Google Play purchases, refund requests are handled by Apple and Google under their respective policies. For purchases made directly on our website, see Section 5.</li>
              </ul>
            </section>

            <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-4">
              <h2 className="text-xl font-bold text-foreground">24. Acceptable Use</h2>
              <p className="text-muted-foreground leading-relaxed">You agree not to:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Use the Platform for any illegal, fraudulent, or harmful activity.</li>
                <li>Impersonate any person or business or misrepresent your credentials, licenses, or insurance.</li>
                <li>Solicit users to transact off-platform to evade fees, ratings, or safety protections.</li>
                <li>Harass, threaten, defame, or stalk other users; share sexually explicit, hateful, or violent content.</li>
                <li>Upload viruses, malware, or any code designed to disrupt the Platform.</li>
                <li>Scrape, crawl, or use automated means to access the Platform except via documented APIs.</li>
                <li>Reverse-engineer, copy, or attempt to extract source code or model weights.</li>
                <li>Use the Platform to spam, send unsolicited communications, or violate anti-spam laws.</li>
                <li>Infringe any intellectual property, privacy, or other right of any third party.</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed">
                We may suspend or terminate accounts that violate this policy, and may report unlawful activity to authorities.
              </p>
            </section>

            <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-4">
              <h2 className="text-xl font-bold text-foreground">25. DMCA / Copyright Complaints</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you believe content on the Platform infringes your copyright, send a notice to <strong>dmca@trimbly.com</strong> including: (a) a physical or electronic signature of the rights owner or authorized agent; (b) identification of the copyrighted work; (c) the URL or location of the allegedly infringing material; (d) your contact information; (e) a statement of good-faith belief that the use is unauthorized; and (f) a statement, under penalty of perjury, that the information is accurate and you are authorized to act. We will respond to valid notices in accordance with the Digital Millennium Copyright Act.
              </p>
            </section>

            <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-4">
              <h2 className="text-xl font-bold text-foreground">26. Export Controls & Sanctions</h2>
              <p className="text-muted-foreground leading-relaxed">
                You may not use or export the Platform in violation of U.S. export laws and regulations. You represent that you are not located in, under the control of, or a national or resident of any country subject to U.S. embargo, and that you are not on any U.S. Government list of restricted parties.
              </p>
            </section>

            <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-4">
              <h2 className="text-xl font-bold text-foreground">27. Privacy</h2>
              <p className="text-muted-foreground leading-relaxed">
                Your use of the Platform is also governed by our{" "}
                <Link to="/privacy" className="text-primary hover:underline font-medium">Privacy Policy</Link>, which is incorporated into these Terms by reference.
              </p>
            </section>

            <section className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-4">
              <h2 className="text-xl font-bold text-foreground">28. Contact</h2>
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
