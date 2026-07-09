import { Sparkles } from "lucide-react";
import Link from "next/link";

interface NavItem {
  label: string;
  href: string;
  active?: boolean;
}

interface AsklyHeaderProps {
  navItems?: NavItem[];
  userInitials?: string;
  userName?: string;
}

const defaultNavItems: NavItem[] = [
  { label: "Courses", href: "/student/courses" },
  { label: "Materials", href: "/student/materials" },
  { label: "Grades", href: "/student/grades" },
  { label: "Schedule", href: "/student/schedule" },
];

export function AsklyHeader({
  navItems = defaultNavItems,
  userInitials = "S",
  userName = "Student",
}: AsklyHeaderProps) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: "0.875rem",
        paddingBottom: "0.875rem",
      }}
    >
      {/* Logo */}
      <Link
        href="/student/dashboard"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.55rem",
          textDecoration: "none",
        }}
      >
        <div
          className="askly-glass"
          style={{
            width: "34px",
            height: "34px",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Sparkles size={16} style={{ color: "var(--askly-amber-400)" }} />
        </div>
        <span
          style={{
            fontSize: "1rem",
            fontWeight: 600,
            color: "var(--askly-text-primary)",
            letterSpacing: "-0.02em",
          }}
        >
          Askly
        </span>
      </Link>

      {/* Nav pills + avatar */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <nav style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={
                item.active ? "askly-glass-active" : "askly-glass-subtle"
              }
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "0.35rem 0.75rem",
                borderRadius: "9999px",
                fontSize: "0.8125rem",
                fontWeight: 500,
                color: item.active
                  ? "var(--askly-amber-100)"
                  : "var(--askly-text-secondary)",
                textDecoration: "none",
                transition: "all 0.15s ease",
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Avatar */}
        <div
          style={{
            width: "34px",
            height: "34px",
            borderRadius: "50%",
            background:
              "linear-gradient(135deg, var(--askly-amber-400) 0%, var(--askly-amber-600) 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.8rem",
            fontWeight: 600,
            color: "#0a0807",
            flexShrink: 0,
            cursor: "pointer",
          }}
          title={userName}
        >
          {userInitials}
        </div>
      </div>
    </header>
  );
}
