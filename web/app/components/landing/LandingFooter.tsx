"use client";

import Link from "next/link";

/** Inline graph logo mark — center white dot, 4 coloured satellite nodes */
function LogoMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      {/* Connection lines */}
      <line x1="10" y1="10" x2="4"  y2="4"  stroke="white" strokeWidth="1"  strokeOpacity="0.3" />
      <line x1="10" y1="10" x2="16" y2="4"  stroke="white" strokeWidth="1"  strokeOpacity="0.3" />
      <line x1="10" y1="10" x2="4"  y2="16" stroke="white" strokeWidth="1"  strokeOpacity="0.3" />
      <line x1="10" y1="10" x2="16" y2="16" stroke="white" strokeWidth="1"  strokeOpacity="0.3" />
      {/* Satellite nodes */}
      <circle cx="4"  cy="4"  r="2"   fill="#4ade80" />
      <circle cx="16" cy="4"  r="2"   fill="#60a5fa" />
      <circle cx="4"  cy="16" r="2"   fill="#f87171" />
      <circle cx="16" cy="16" r="2"   fill="#c4b5fd" />
      {/* Center dot */}
      <circle cx="10" cy="10" r="3.5" fill="white" />
    </svg>
  );
}

export default function LandingFooter() {
  return (
    <footer
      style={{
        backgroundColor: "#050505",
        borderTop: "1px solid rgba(255,255,255,0.08)",
      }}
      className="py-10 px-5 lg:px-16"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">

        {/* ── Left: logo + wordmark + tagline ─────────────────────────── */}
        <div className="flex items-center gap-2.5">
          <LogoMark />
          <div className="flex flex-col gap-0.5">
            <span
              className="text-white leading-none"
              style={{
                fontFamily: "var(--font-space-grotesk)",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              InvestorBrain
            </span>
            <span
              className="leading-none"
              style={{
                fontFamily: "var(--font-geist-mono)",
                fontSize: "9px",
                letterSpacing: "0.08em",
                color: "rgba(255,255,255,0.4)",
              }}
            >
              bias-aware investing memory
            </span>
          </div>
        </div>

        {/* ── Right: cognee credit + sign-in ───────────────────────────── */}
        <div className="flex items-center gap-5">
          <span
            style={{
              fontFamily: "var(--font-geist-mono)",
              fontSize: "9px",
              letterSpacing: "0.08em",
              color: "rgba(255,255,255,0.4)",
            }}
          >
            Powered by Cognee
          </span>

          <Link
            href="/signin"
            className="text-white/60 hover:text-white"
            style={{
              fontFamily: "var(--font-geist-sans)",
              fontSize: "12px",
              transition: "color 150ms ease",
            }}
          >
            Sign in
          </Link>
        </div>

      </div>
    </footer>
  );
}
