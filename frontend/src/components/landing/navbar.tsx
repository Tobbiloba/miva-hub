"use client";
import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "../ui/button";
import { Menu, X } from "lucide-react";

const links = [
  {
    label: "Home",
    href: "/",
  },
  {
    label: "Pricing",
    href: "/pricing",
  },
  {
    label: "Features",
    href: "#features",
  },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="flex items-center justify-between h-12 md:h-14 text-white">
      {/* Desktop Links */}
      <div className="hidden md:flex items-center gap-8 lg:gap-10">
        {links.map((link, index) => (
          <Link key={index} href={link.href} className="flex items-center gap-2 font-medium text-sm lg:text-base">
            <p className="text-sm font-[300] text-neutral-500">{index + 1}</p>
            {link.label}
          </Link>
        ))}
      </div>

      {/* Logo */}
      <div className="h-fit flex-shrink-0">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="Askly logo" width={40} height={40} className="md:w-14 md:h-14" />
        </div>
      </div>

      {/* Desktop Button */}
      <div className="hidden md:block">
        <Button className="rounded gap-2 p-1 pl-4 lg:pl-6 h-fit hover:gap-3 transition-all text-sm lg:text-base">
          Sign In <div className="p-2 ml-2 px-3 lg:px-4 bg-black text-white rounded text-xs lg:text-sm">Sign Up</div>
        </Button>
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
                <p className="text-sm font-[300] text-neutral-500">{index + 1}</p>
                {link.label}
              </Link>
            ))}
            <div className="pt-4 border-t border-neutral-800">
              <Button className="w-full rounded gap-2 p-2 justify-center">
                Sign In <div className="p-1.5 px-3 bg-black text-white rounded text-sm">Sign Up</div>
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
