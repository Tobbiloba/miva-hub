"use client";

import { useRef, useEffect } from "react";
import { MessageCircle, Paperclip, Mic, ArrowUp, X } from "lucide-react";

interface AsklyComposerProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  contextChip?: string;
  onClearChip?: () => void;
  maxLength?: number;
}

export function AsklyComposer({
  label = "Ask Askly anything",
  placeholder = "Ask anything…",
  value,
  onChange,
  onSubmit,
  contextChip,
  onClearChip,
  maxLength = 2000,
}: AsklyComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) onSubmit(value);
    }
  };

  const charCount = value.length;
  const nearLimit = charCount > maxLength * 0.85;

  return (
    <div
      className="askly-glass"
      style={{
        borderRadius: "20px",
        padding: "1rem 1rem 0.75rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
      }}
    >
      {/* Label row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.45rem",
          paddingBottom: "0.25rem",
        }}
      >
        <MessageCircle
          size={13}
          style={{ color: "var(--askly-amber-400)", flexShrink: 0 }}
        />
        <span
          style={{
            fontSize: "0.75rem",
            fontWeight: 500,
            color: "var(--askly-text-tertiary)",
            letterSpacing: "0.02em",
          }}
        >
          {label}
        </span>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={1}
        style={{
          width: "100%",
          background: "transparent",
          border: "none",
          outline: "none",
          resize: "none",
          fontSize: "0.9375rem",
          lineHeight: "1.55",
          color: "var(--askly-text-primary)",
          caretColor: "var(--askly-amber-400)",
          fontFamily: "inherit",
          minHeight: "28px",
          maxHeight: "200px",
          overflow: "auto",
        }}
      />

      {/* Bottom row: context chip + actions */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.5rem",
        }}
      >
        {/* Left side: context chip */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          {contextChip && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
                fontSize: "0.75rem",
                fontWeight: 500,
                color: "var(--askly-amber-100)",
                background: "rgba(250,199,117,0.12)",
                border: "0.5px solid rgba(250,199,117,0.25)",
                borderRadius: "9999px",
                padding: "0.2rem 0.55rem",
              }}
            >
              {contextChip}
              {onClearChip && (
                <button
                  type="button"
                  onClick={onClearChip}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    color: "var(--askly-text-muted)",
                  }}
                >
                  <X size={10} />
                </button>
              )}
            </span>
          )}
        </div>

        {/* Right side: attachment + voice + char count + send */}
        <div
          style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
        >
          <button
            type="button"
            aria-label="Attach file"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--askly-text-muted)",
              transition: "color 0.15s ease",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "var(--askly-text-secondary)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--askly-text-muted)")
            }
          >
            <Paperclip size={15} />
          </button>

          <button
            type="button"
            aria-label="Voice input"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--askly-text-muted)",
              transition: "color 0.15s ease",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "var(--askly-text-secondary)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--askly-text-muted)")
            }
          >
            <Mic size={15} />
          </button>

          {nearLimit && (
            <span
              style={{
                fontSize: "0.7rem",
                color:
                  charCount >= maxLength
                    ? "#ef4444"
                    : "var(--askly-text-muted)",
              }}
            >
              {charCount}/{maxLength}
            </span>
          )}

          {/* Send button */}
          <button
            type="button"
            onClick={() => value.trim() && onSubmit(value)}
            aria-label="Send message"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "38px",
              height: "38px",
              borderRadius: "50%",
              border: "none",
              cursor: value.trim() ? "pointer" : "not-allowed",
              background: value.trim()
                ? "linear-gradient(135deg, var(--askly-amber-400) 0%, var(--askly-amber-600) 100%)"
                : "rgba(255,255,255,0.06)",
              color: value.trim()
                ? "#0a0807"
                : "var(--askly-text-muted)",
              transition: "all 0.15s ease",
              flexShrink: 0,
              boxShadow: value.trim()
                ? "0 2px 12px rgba(239,159,39,0.35)"
                : "none",
            }}
          >
            <ArrowUp size={17} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
