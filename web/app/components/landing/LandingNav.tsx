"use client";

import Link from "next/link";

// ── Logo mark adapted for royal-blue background: white center, colored sats ─
function LogoMark() {
  return (
    <svg width="24" height="24" viewBox="0 0 20 20" fill="none" aria-hidden>
      <line x1="10" y1="10" x2="4"  y2="4"  stroke="white" strokeWidth="1"  strokeOpacity="0.55" />
      <line x1="10" y1="10" x2="16" y2="4"  stroke="white" strokeWidth="1"  strokeOpacity="0.55" />
      <line x1="10" y1="10" x2="4"  y2="16" stroke="white" strokeWidth="1"  strokeOpacity="0.55" />
      <line x1="10" y1="10" x2="16" y2="16" stroke="white" strokeWidth="1"  strokeOpacity="0.55" />
      <circle cx="4"  cy="4"  r="2"   fill="#22c55e" />
      <circle cx="16" cy="4"  r="2"   fill="#4f9cf9" />
      <circle cx="4"  cy="16" r="2"   fill="#ef4444" />
      <circle cx="16" cy="16" r="2"   fill="#a78bfa" />
      <circle cx="10" cy="10" r="3.5" fill="white" />
      <circle cx="8.7" cy="8.7" r="1.1" fill="rgba(255,255,255,0.28)" />
    </svg>
  );
}

// ── Button-in-button CTA ─────────────────────────────────────────────────────
function CtaButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center rounded-[6px] bg-white overflow-hidden cursor-pointer select-none active:scale-[0.98]"
      style={{
        transition: "transform 200ms cubic-bezier(0.32,0.72,0,1)",
        boxShadow: "0 0 0 1px rgba(0,0,0,0.12), 0 2px 10px rgba(0,0,0,0.18)",
      }}
    >
      <span className="h-[38px] flex items-center px-5 text-[13px] font-semibold text-[#111] whitespace-nowrap">
        {label}
      </span>
      <span
        className="w-[38px] h-[38px] flex-shrink-0 flex items-center justify-center group-hover:translate-x-[1px] group-hover:-translate-y-[1px]"
        style={{
          background: "#1d3be0",
          transition: "transform 200ms cubic-bezier(0.32,0.72,0,1)",
        }}
      >
        <span className="text-white text-[15px] leading-none">↗</span>
      </span>
    </Link>
  );
}

// ── Main Nav ─────────────────────────────────────────────────────────────────
interface LandingNavProps {
  isAuthed: boolean;
}

export default function LandingNav({ isAuthed }: LandingNavProps) {
  return (
    <nav className="sticky top-0 z-40 w-full px-4 pt-5 pb-3 pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-6xl flex items-center justify-between gap-4">

        {/* ── Logo + wordmark — dark pill so it stays legible on white sections ── */}
        <div
          className="flex items-center gap-2.5 flex-shrink-0 pl-3 pr-4 py-2 rounded-full"
          style={{ background: "rgba(0,0,0,0.82)" }}
        >
          <LogoMark />
          <span
            className="text-white text-[14px] font-semibold tracking-[-0.01em]"
            style={{ fontFamily: "var(--font-space-grotesk, var(--font-geist-sans))" }}
          >
            InvestorBrain
          </span>
        </div>

        {/* ── Center pill nav (hidden on mobile) ── */}
        <div
          className="hidden md:flex items-center gap-0.5 px-1.5 py-1.5 rounded-full flex-shrink-0"
          style={{ background: "rgba(0,0,0,0.82)" }}
        >
          {/* Active: white pill */}
          <a
            href="#"
            className="px-4 py-[6px] rounded-full bg-white text-[#111] text-[13px] font-medium whitespace-nowrap cursor-pointer"
          >
            Home
          </a>
          {[
            { label: "Product",      href: "#product" },
            { label: "How it works", href: "#how" },
            { label: "Memory",       href: "#memory" },
          ].map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="px-4 py-[6px] rounded-full text-white/65 hover:text-white text-[13px] font-medium whitespace-nowrap cursor-pointer"
              style={{ transition: "color 150ms ease" }}
            >
              {label}
            </a>
          ))}
        </div>

        {/* ── Right CTAs ── */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {isAuthed ? (
            <CtaButton href="/dashboard" label="Open Dashboard" />
          ) : (
            <>
              {/* Dark pill Sign in */}
              <Link
                href="/signin"
                className="hidden sm:flex h-[38px] items-center px-4 rounded-full text-white/85 hover:text-white text-[13px] font-medium cursor-pointer"
                style={{
                  background: "rgba(0,0,0,0.72)",
                  transition: "color 150ms ease",
                }}
              >
                Sign in
              </Link>
              <CtaButton href="/signin" label="Get Started" />
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
