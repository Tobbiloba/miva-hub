import { AsklyLogo } from "@/components/ui/logo-box";
import Link from "next/link";

const Footer = () => {
  return (
    <footer className="mt-16 sm:mt-24 md:mt-32 p-2 sm:p-4">
      <div className="relative bg-black/30 px-4 sm:px-6 md:px-8 rounded py-10 sm:py-12 md:py-16">
        <div className="pointer-events-none absolute -top-10 right-10 w-48 h-48 sm:w-64 sm:h-64 bg-white/5 rounded-full blur-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10 md:gap-12 mb-8 sm:mb-10 md:mb-12">
          {/* Brand Section */}
          <div className="space-y-3 sm:space-y-4">
            <AsklyLogo
              className="[&>span:last-child]:text-lg"
              markClassName="size-8 bg-white text-black"
            />
            <p className="text-neutral-400 text-base max-w-xs">
              Askly is your AI study partner. It answers from your own lectures,
              with sources, and keeps your revision and deadlines in one place.
            </p>
            <div className="inline-flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded text-sm border border-white/10">
              <span className="text-neutral-300">Built for MIVA students</span>
            </div>
          </div>

          {/* Product Links */}
          <div className="space-y-4">
            <h3 className="text-white font-medium text-base">Product</h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="#features"
                  className="text-neutral-400 text-base hover:text-white transition-colors"
                >
                  Features
                </a>
              </li>
              <li>
                <a
                  href="#how-it-works"
                  className="text-neutral-400 text-base hover:text-white transition-colors"
                >
                  Chrome extension
                </a>
              </li>
              <li>
                <a
                  href="#faq"
                  className="text-neutral-400 text-base hover:text-white transition-colors"
                >
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          {/* Account Links */}
          <div className="space-y-4">
            <h3 className="text-white font-medium text-base">Account</h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="/sign-in"
                  className="text-neutral-400 text-base hover:text-white transition-colors"
                >
                  Sign in
                </a>
              </li>
              <li>
                <a
                  href="#waitlist"
                  className="text-neutral-400 text-base hover:text-white transition-colors"
                >
                  Join the waitlist
                </a>
              </li>
            </ul>
          </div>

          {/* (Newsletter removed) */}
        </div>

        {/* Bottom Section */}
        <div className="pt-6 sm:pt-8 border-t border-neutral-800 flex flex-col md:flex-row items-center justify-between gap-4 px-4 sm:px-0">
          <p className="text-neutral-500 text-sm sm:text-base text-center md:text-left">
            © {new Date().getFullYear()} Askly. All rights reserved.
          </p>
          <div className="flex items-center gap-4 sm:gap-6 flex-wrap justify-center">
            <Link
              href="/privacy"
              className="text-neutral-500 text-sm sm:text-base hover:text-white transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-neutral-500 text-sm sm:text-base hover:text-white transition-colors"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
