/**
 * Phase 1 QA scaffold — visual inspection of all Askly primitives.
 * Navigatable at /askly-tokens during dev. Not linked from anywhere.
 * Remove or archive after Phase 2 sign-off.
 */

import { AsklyBackground } from "@/components/ask/AsklyBackground";
import { AsklyGlassCard } from "@/components/ask/AsklyGlassCard";
import { AsklyHeader } from "@/components/ask/AsklyHeader";
import { TokensClientSection } from "./TokensClientSection";

export default function AsklyTokensPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--askly-bg)",
        color: "var(--askly-text-primary)",
        fontFamily: "inherit",
        position: "relative",
      }}
    >
      <AsklyBackground intensity="normal" />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          maxWidth: "880px",
          margin: "0 auto",
          padding: "1.5rem 1.5rem 4rem",
        }}
      >
        <AsklyHeader
          navItems={[
            { label: "Courses", href: "#", active: true },
            { label: "Materials", href: "#" },
            { label: "Grades", href: "#" },
            { label: "Schedule", href: "#" },
          ]}
          userInitials="AO"
          userName="Ada Okonkwo"
        />

        <div style={{ marginTop: "2rem" }}>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 600,
              color: "var(--askly-text-primary)",
              marginBottom: "2rem",
            }}
          >
            Askly Design System — Token Preview
          </h1>

          {/* Colour tokens */}
          <section style={{ marginBottom: "2.5rem" }}>
            <h2
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--askly-text-tertiary)",
                marginBottom: "0.75rem",
              }}
            >
              Amber ramp
            </h2>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {[
                ["50", "#FAEEDA"],
                ["100", "#FAC775"],
                ["400", "#EF9F27"],
                ["600", "#BA7517"],
                ["800", "#633806"],
                ["900", "#412402"],
              ].map(([label, color]) => (
                <div key={label} style={{ textAlign: "center" }}>
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "10px",
                      background: color,
                      border: "0.5px solid var(--askly-border)",
                    }}
                  />
                  <div
                    style={{
                      fontSize: "0.65rem",
                      color: "var(--askly-text-muted)",
                      marginTop: "0.25rem",
                    }}
                  >
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Glass surfaces */}
          <section style={{ marginBottom: "2.5rem" }}>
            <h2
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--askly-text-tertiary)",
                marginBottom: "0.75rem",
              }}
            >
              Glass surfaces
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "1rem",
              }}
            >
              <AsklyGlassCard>
                <p
                  style={{
                    fontSize: "0.8125rem",
                    color: "var(--askly-text-secondary)",
                  }}
                >
                  .askly-glass
                </p>
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--askly-text-muted)",
                    marginTop: "0.25rem",
                  }}
                >
                  Primary card surface
                </p>
              </AsklyGlassCard>
              <div
                className="askly-glass-subtle"
                style={{ borderRadius: "18px", padding: "1.25rem" }}
              >
                <p
                  style={{
                    fontSize: "0.8125rem",
                    color: "var(--askly-text-secondary)",
                  }}
                >
                  .askly-glass-subtle
                </p>
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--askly-text-muted)",
                    marginTop: "0.25rem",
                  }}
                >
                  Pills & buttons (hover me)
                </p>
              </div>
              <div
                className="askly-glass-active"
                style={{ borderRadius: "18px", padding: "1.25rem" }}
              >
                <p
                  style={{
                    fontSize: "0.8125rem",
                    color: "var(--askly-amber-100)",
                  }}
                >
                  .askly-glass-active
                </p>
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--askly-text-muted)",
                    marginTop: "0.25rem",
                  }}
                >
                  Selected state
                </p>
              </div>
            </div>
          </section>

          {/* Client-side components (pills + composer) */}
          <TokensClientSection />
        </div>
      </div>
    </div>
  );
}
