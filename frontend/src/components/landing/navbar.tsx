"use client";
import { AsklyLogo } from "@/components/ui/logo-box";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const links = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "FAQ", href: "#faq" },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="flex items-center justify-between h-12 md:h-14 text-white">
      {/* Desktop Links */}
      <div className="hidden md:flex items-center gap-8 lg:gap-10">
        {links.map((link, index) => (
          <Link
            key={index}
            href={link.href}
            className="flex items-center gap-2 font-medium text-sm lg:text-base"
          >
            <p className="text-sm font-[300] text-neutral-500">{index + 1}</p>
            {link.label}
          </Link>
        ))}
      </div>

      {/* Logo */}
      <Link
        href="/landing"
        aria-label="Askly home"
        className="h-fit flex-shrink-0"
      >
        <AsklyLogo
          className="[&>span:last-child]:text-lg"
          markClassName="size-8 bg-white text-black"
        />
      </Link>

      {/* Desktop Button */}
      <div className="hidden md:block">
        <div className="flex items-center gap-2 rounded bg-white p-1 pl-4 text-sm text-black lg:pl-6 lg:text-base">
          <Link href="/sign-in" className="font-medium">
            Sign In
          </Link>
          <a
            href="#waitlist"
            className="ml-2 rounded bg-black p-2 px-3 text-xs text-white lg:px-4 lg:text-sm"
          >
            Join the waitlist
          </a>
        </div>
      </div>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden text-white p-2"
        aria-label="Toggle menu"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="absolute top-14 left-0 right-0 bg-black/95 backdrop-blur-sm border-b border-neutral-800 z-50 md:hidden">
          <div className="container mx-auto px-4 py-6 space-y-4">
            {links.map((link, index) => (
              <Link
                key={index}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 font-medium text-base py-2"
              >
                <p className="text-sm font-[300] text-neutral-500">
                  {index + 1}
                </p>
                {link.label}
              </Link>
            ))}
            <div className="flex items-center justify-center gap-2 rounded border-t border-neutral-800 bg-white p-2 text-black">
              <Link href="/sign-in" className="font-medium">
                Sign In
              </Link>
              <a
                href="#waitlist"
                onClick={() => setIsOpen(false)}
                className="rounded bg-black p-1.5 px-3 text-sm text-white"
              >
                Join the waitlist
              </a>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
