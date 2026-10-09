import { AsklyLogo } from "@/components/ui/logo-box";
import Link from "next/link";

const columns = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "Chrome extension", href: "#how-it-works" },
      { label: "FAQ", href: "#faq" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Sign in", href: "/sign-in" },
      { label: "Join the waitlist", href: "#waitlist" },
    ],
  },
];

const Footer = () => {
  return (
    <footer className="mx-auto max-w-6xl px-5 pt-16 pb-10 sm:px-8">
      <div className="grid grid-cols-2 gap-10 border-t border-border pt-12 md:grid-cols-[2fr_1fr_1fr]">
        <div className="col-span-2 space-y-4 md:col-span-1">
          <AsklyLogo
            className="[&>span:last-child]:text-lg"
            markClassName="size-8 rounded-[9px] bg-white text-black"
          />
          <p className="max-w-xs text-[15px] leading-relaxed text-muted-foreground">
            Your AI study partner. Answers from your own lectures, with sources,
            and your revision and deadlines in one place.
          </p>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs text-white/70">
            <span className="size-1.5 rounded-full bg-brand" />
            Built for MIVA students
          </span>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <h3 className="text-sm font-medium text-foreground">{col.title}</h3>
            <ul className="mt-4 space-y-3">
              {col.links.map((l) => (
                <li key={l.label}>
                  {l.href.startsWith("/") ? (
                    <Link
                      href={l.href}
                      className="text-[15px] text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {l.label}
                    </Link>
                  ) : (
                    <a
                      href={l.href}
                      className="text-[15px] text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {l.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 text-sm text-muted-foreground md:flex-row">
        <p>© {new Date().getFullYear()} Askly. All rights reserved.</p>
        <div className="flex gap-6">
          <Link href="/privacy" className="hover:text-foreground">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            Terms of Service
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
