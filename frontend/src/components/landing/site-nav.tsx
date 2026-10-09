"use client";

import { AsklyLogo } from "@/components/ui/logo-box";
import { cn } from "lib/utils";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how", label: "How it works" },
  { href: "#appearance", label: "Appearance" },
  { href: "#waitlist", label: "Waitlist" },
];

/** Navbar that sits on the hero photo (white on image). */
export function SiteNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="relative z-20 text-white">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/landing" aria-label="Askly home">
          <AsklyLogo markClassName="bg-white text-black" />
        </Link>
        <ul className="hidden items-center gap-8 text-sm font-medium text-white/85 md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="transition hover:text-white">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/sign-in"
            className="rounded-lg border border-white/40 px-3.5 py-1.5 text-sm font-medium transition hover:bg-white/10"
          >
            Sign in
          </Link>
          <a
            href="#waitlist"
            className="rounded-lg bg-white px-3.5 py-1.5 text-sm font-semibold text-neutral-900 transition hover:bg-white/90"
          >
            Join waitlist
          </a>
        </div>
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="grid size-11 place-items-center rounded-lg md:hidden"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>
      <div
        className={cn(
          "mx-4 overflow-hidden rounded-2xl bg-white text-neutral-900 shadow-xl transition-all md:hidden",
          open ? "max-h-96 p-2" : "max-h-0",
        )}
      >
        {LINKS.map((l) => (
          <a
            key={l.href}
            href={l.href}
            onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-3 text-sm font-medium hover:bg-neutral-100"
          >
            {l.label}
          </a>
        ))}
        <Link
          href="/sign-in"
          className="block rounded-lg px-3 py-3 text-sm font-medium hover:bg-neutral-100"
        >
          Sign in
        </Link>
      </div>
    </header>
  );
}
