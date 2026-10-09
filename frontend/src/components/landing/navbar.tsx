"use client";
import { AsklyLogo } from "@/components/ui/logo-box";
import { cn } from "lib/utils";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { btnPrimary } from "./styles";

const links = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "FAQ", href: "#faq" },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="relative flex h-14 items-center justify-between">
      <div className="hidden items-center gap-8 md:flex lg:gap-10">
        {links.map((link, index) => (
          <a
            key={link.href}
            href={link.href}
            className="flex items-center gap-2 text-sm font-medium text-white/80 transition-colors hover:text-white"
          >
            <span className="text-xs font-normal text-white/40 tabular-nums">
              {index + 1}
            </span>
            {link.label}
          </a>
        ))}
      </div>

      <Link
        href="/landing"
        aria-label="Askly home"
        className="md:absolute md:left-1/2 md:-translate-x-1/2"
      >
        <AsklyLogo
          className="[&>span:last-child]:text-lg"
          markClassName="size-8 rounded-[9px] bg-white text-black"
        />
      </Link>

      <div className="hidden items-center gap-1 md:flex">
        <Link
          href="/sign-in"
          className="rounded-full px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:text-white"
        >
          Sign in
        </Link>
        <a href="#waitlist" className={cn(btnPrimary, "h-9 px-4 text-sm")}>
          Join the waitlist
        </a>
      </div>

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="-mr-2 grid size-11 place-items-center rounded-full text-white md:hidden"
        aria-label={isOpen ? "Close menu" : "Open menu"}
        aria-expanded={isOpen}
      >
        {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      {isOpen && (
        <div className="absolute top-14 right-0 left-0 z-50 rounded-2xl border border-white/10 bg-card/95 p-2 shadow-[var(--shadow-float)] backdrop-blur md:hidden">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className="block rounded-xl px-4 py-3 text-base font-medium text-white/90 hover:bg-white/5"
            >
              {link.label}
            </a>
          ))}
          <div className="mt-2 grid grid-cols-2 gap-2 border-t border-white/10 pt-3">
            <Link
              href="/sign-in"
              className="grid h-11 place-items-center rounded-full border border-white/15 text-sm font-medium"
            >
              Sign in
            </Link>
            <a
              href="#waitlist"
              onClick={() => setIsOpen(false)}
              className={cn(btnPrimary, "text-sm")}
            >
              Join the waitlist
            </a>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
