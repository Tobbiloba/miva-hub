/* eslint-disable react/no-unescaped-entities */

import { FileText } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12 md:py-20">
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium">
            <FileText className="h-4 w-4" />
            Terms & Conditions
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            Terms of Service
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Please read these terms carefully. By using MIVA Hub, you agree to be bound by these terms and conditions.
          </p>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          {/* Table of Contents */}
          <div className="mb-12 p-6 rounded-lg bg-primary/5 border border-primary/10">
            <h2 className="text-sm font-semibold text-primary mb-4 uppercase tracking-wide">Quick Navigation</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { num: "1", title: "Acceptance of Terms" },
                { num: "2", title: "Use License" },
                { num: "3", title: "Disclaimer" },
                { num: "4", title: "Limitations" },
                { num: "5", title: "Accuracy" },
                { num: "6", title: "Materials & Content" },
                { num: "7", title: "Modifications" },
                { num: "8", title: "Governing Law" },
                { num: "9", title: "Subscription & Payment" },
                { num: "10", title: "User Responsibilities" },
                { num: "11", title: "Contact" },
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
                  <h2 className="text-2xl font-bold text-foreground mb-3">Acceptance of Terms</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    By accessing and using MIVA Hub, you accept and agree to be bound by the terms and provision of this agreement.
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
                  <h2 className="text-2xl font-bold text-foreground mb-4">Use License</h2>
                  <p className="text-muted-foreground mb-4 leading-relaxed">
                    Permission is granted to temporarily download one copy of the materials (information or software) on MIVA Hub
                    for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title.
                  </p>
                  <p className="text-muted-foreground mb-3 font-semibold">You may not:</p>
                  <ul className="space-y-2">
                    {[
                      "Modify or copy the materials",
                      "Use the materials for any commercial purpose or for any public display",
                      "Attempt to decompile or reverse engineer any software",
                      "Remove any copyright or other proprietary notations from the materials",
                      "Transfer the materials to another person or mirror the materials on any other server",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-muted-foreground">
                        <span className="text-primary font-bold mt-0.5">✗</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
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
                  <h2 className="text-2xl font-bold text-foreground mb-3">Disclaimer</h2>
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                    <p className="text-muted-foreground leading-relaxed">
                      The materials on MIVA Hub are provided on an "as is" basis. MIVA University makes no warranties, expressed or
                      implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties
                      or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property
                      or other violation of rights.
                    </p>
                  </div>
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
                  <h2 className="text-2xl font-bold text-foreground mb-3">Limitations of Liability</h2>
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                    <p className="text-muted-foreground leading-relaxed">
                      In no event shall MIVA University or its suppliers be liable for any damages (including, without limitation,
                      damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use
                      the materials on MIVA Hub.
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
                  <h2 className="text-2xl font-bold text-foreground mb-3">Accuracy of Materials</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    The materials appearing on MIVA Hub could include technical, typographical, or photographic errors. MIVA
                    University does not warrant that any of the materials on MIVA Hub are accurate, complete, or current.
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
                  <h2 className="text-2xl font-bold text-foreground mb-3">Materials and Content</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    MIVA Hub has not reviewed all of the sites linked to its website and is not responsible for the contents of any
                    such linked site. The inclusion of any link does not imply endorsement by MIVA University of the site. Use of
                    any such linked website is at the user&apos;s own risk.
                  </p>
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
                  <h2 className="text-2xl font-bold text-foreground mb-3">Modifications to Terms</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    MIVA University may revise these terms of service for MIVA Hub at any time without notice. By using this
                    website, you are agreeing to be bound by the then current version of these terms of service.
                  </p>
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
                  <h2 className="text-2xl font-bold text-foreground mb-3">Governing Law</h2>
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                    <p className="text-muted-foreground leading-relaxed">
                      These terms and conditions are governed by and construed in accordance with the laws of Nigeria, and you
                      irrevocably submit to the exclusive jurisdiction of the courts in that location.
                    </p>
                  </div>
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
                  <h2 className="text-2xl font-bold text-foreground mb-4">Subscription and Payment</h2>
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                      <h3 className="text-lg font-semibold text-foreground mb-2">Monthly Billing</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        Subscription to MIVA Hub is billed on a monthly basis. By subscribing, you authorize MIVA University to charge
                        your payment method on a recurring monthly basis until you cancel your subscription.
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                      <h3 className="text-lg font-semibold text-foreground mb-2">Cancellation</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        You can cancel your subscription at any time through your account settings. Cancellation is effective at the
                        end of your current billing period.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 10 */}
            <section id="section-10" className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-semibold">10</span>
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-foreground mb-4">User Responsibilities</h2>
                  <p className="text-muted-foreground mb-4 leading-relaxed">You agree to:</p>
                  <ul className="space-y-2">
                    {[
                      "Provide accurate registration information",
                      "Maintain the confidentiality of your account password",
                      "Accept responsibility for all activities under your account",
                      "Use the service in compliance with all applicable laws",
                      "Not use the service for any unlawful purposes",
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

            {/* Section 11 */}
            <section id="section-11" className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-semibold">11</span>
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-foreground mb-3">Contact Us</h2>
                  <p className="text-muted-foreground mb-4 leading-relaxed">
                    If you have any questions about these Terms of Service, please contact us:
                  </p>
                  <a
                    href="mailto:support@miva-hub.com"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
                  >
                    support@miva-hub.com
                  </a>
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
