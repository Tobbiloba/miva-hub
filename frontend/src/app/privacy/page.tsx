/* eslint-disable react/no-unescaped-entities */

import { Shield } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12 md:py-20">
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium">
            <Shield className="h-4 w-4" />
            Your Privacy Matters
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            Privacy Policy
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We&apos;re committed to protecting your data and being transparent about how we use it. Learn about our privacy practices and your rights.
          </p>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          {/* Table of Contents */}
          <div className="mb-12 p-6 rounded-lg bg-primary/5 border border-primary/10">
            <h2 className="text-sm font-semibold text-primary mb-4 uppercase tracking-wide">Quick Navigation</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { num: "1", title: "Introduction" },
                { num: "2", title: "Information Collection" },
                { num: "3", title: "Use of Data" },
                { num: "4", title: "Security" },
                { num: "5", title: "Changes" },
                { num: "6", title: "Contact" },
                { num: "7", title: "Student Protection" },
                { num: "8", title: "Data Retention" },
                { num: "9", title: "Third-Party Services" },
              ].map((item) => (
                <a
                  key={item.num}
                  href={`#section-${item.num}`}
                  className="text-sm text-primary hover:underline transition-colors"
                >
                  {item.num}. {item.title}
                </a>
              ))}
            </div>
          </div>

          {/* Sections */}
          <div className="space-y-10">
            {/* Section 1 */}
            <section id="section-1" className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-semibold">1</span>
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-foreground mb-3">Introduction</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    MIVA Hub ("Company", "we", "our", or "us") operates the MIVA Hub service (the "Service"). This page informs you
                    of our policies regarding the collection, use, and disclosure of personal data when you use our Service and the
                    choices you have associated with that data.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 2 */}
            <section id="section-2" className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-semibold">2</span>
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-foreground mb-4">Information Collection and Use</h2>
                  <p className="text-muted-foreground mb-4 leading-relaxed">We collect several different types of information for various purposes to provide and improve our Service:</p>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                      <h3 className="text-lg font-semibold text-foreground mb-3">Personal Data</h3>
                      <ul className="space-y-2">
                        {["Email address", "Name", "Student ID / Faculty ID", "Academic information", "Payment information", "Usage data and chat history"].map((item) => (
                          <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="text-primary font-bold mt-0.5">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                      <h3 className="text-lg font-semibold text-foreground mb-3">Usage Data</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Information about how the Service is accessed and used, including IP address, browser type, pages visited, and diagnostic data.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 3 */}
            <section id="section-3" className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-semibold">3</span>
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-foreground mb-4">Use of Data</h2>
                  <p className="text-muted-foreground mb-4 leading-relaxed">MIVA Hub uses the collected data for various purposes:</p>
                  <ul className="space-y-2">
                    {[
                      "To provide and maintain our Service",
                      "To notify you about changes to our Service",
                      "To allow you to participate in interactive features",
                      "To provide customer support",
                      "To gather analysis and improve our Service",
                      "To monitor the usage of our Service",
                      "To detect and address technical and security issues",
                      "To process payments and send related information",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-muted-foreground">
                        <span className="text-primary font-bold mt-0.5">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            {/* Section 4 */}
            <section id="section-4" className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-semibold">4</span>
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-foreground mb-3">Security of Data</h2>
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                    <p className="text-muted-foreground leading-relaxed">
                      The security of your data is important to us. While no method of transmission over the Internet is 100% secure, we strive to use commercially acceptable means to protect your Personal Data. We cannot guarantee its absolute security.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 5 */}
            <section id="section-5" className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-semibold">5</span>
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-foreground mb-3">Changes to This Privacy Policy</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy
                    Policy on this page and updating the effective date at the bottom.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 6 */}
            <section id="section-6" className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-semibold">6</span>
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-foreground mb-3">Contact Us</h2>
                  <p className="text-muted-foreground mb-4 leading-relaxed">
                    If you have any questions about this Privacy Policy, please contact us:
                  </p>
                  <a
                    href="mailto:privacy@miva-hub.com"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
                  >
                    privacy@miva-hub.com
                  </a>
                </div>
              </div>
            </section>

            {/* Section 7 */}
            <section id="section-7" className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-semibold">7</span>
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-foreground mb-3">Student Data Protection (FERPA)</h2>
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                    <p className="text-muted-foreground leading-relaxed">
                      MIVA Hub complies with FERPA (Family Educational Rights and Privacy Act) requirements for the protection of
                      student educational records. Your academic information and grades are treated with the utmost confidentiality.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 8 */}
            <section id="section-8" className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-semibold">8</span>
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-foreground mb-3">Data Retention</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    MIVA Hub will retain your Personal Data only for as long as necessary to provide our Service and for the purposes
                    outlined in this Privacy Policy. You can request deletion of your data at any time through your account settings.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 9 */}
            <section id="section-9" className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-semibold">9</span>
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-foreground mb-3">Third-Party Services</h2>
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                    <p className="text-muted-foreground leading-relaxed">
                      We use Paystack for payment processing. Please review their privacy policy for information on how they handle your
                      payment information. We do not share your personal data with other third parties without your explicit consent.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="mt-16 pt-8 border-t border-primary/10">
            <p className="text-sm text-muted-foreground">
              Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
