"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useReveal } from "./useReveal";

const EASE = "cubic-bezier(0.32,0.72,0,1)";

function rv(visible: boolean, reduced: boolean, delay = 0): CSSProperties {
  if (reduced) return {};
  return {
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(3rem)",
    transition: `opacity 800ms ${EASE} ${delay}ms, transform 800ms ${EASE} ${delay}ms`,
  };
}

// ── Card SVG illustrations ────────────────────────────────────────────────────

/** GRAPH card: central chip with PCB traces radiating outward */
function IllustrationGraph() {
  return (
    <svg
      viewBox="0 0 200 150"
      fill="none"
      width="200"
      height="150"
      style={{ filter: "drop-shadow(0 0 6px rgba(255,255,255,0.35))" }}
      aria-hidden="true"
    >
      {/* Central chip */}
      <rect x="72" y="50" width="56" height="50" rx="4" stroke="white" strokeOpacity="0.7" strokeWidth="1" />
      {/* Chip inner detail lines */}
      <line x1="84" y1="65" x2="116" y2="65" stroke="white" strokeOpacity="0.35" strokeWidth="0.75" />
      <line x1="84" y1="75" x2="116" y2="75" stroke="white" strokeOpacity="0.35" strokeWidth="0.75" />
      <line x1="84" y1="85" x2="116" y2="85" stroke="white" strokeOpacity="0.35" strokeWidth="0.75" />
      {/* Left traces */}
      <path d="M 72 62 H 40 Q 28 62 28 50 V 10" stroke="white" strokeOpacity="0.7" strokeWidth="1" />
      <path d="M 72 78 H 10" stroke="white" strokeOpacity="0.7" strokeWidth="1" />
      {/* Right traces */}
      <path d="M 128 62 H 162 Q 174 62 174 74 V 150" stroke="white" strokeOpacity="0.7" strokeWidth="1" />
      <path d="M 128 88 H 196" stroke="white" strokeOpacity="0.7" strokeWidth="1" />
      {/* Top traces */}
      <path d="M 90 50 V 20 Q 90 8 102 8 H 200" stroke="white" strokeOpacity="0.7" strokeWidth="1" />
      {/* Bottom traces */}
      <path d="M 100 100 V 130 Q 100 142 88 142 H 0" stroke="white" strokeOpacity="0.7" strokeWidth="1" />
      {/* Terminal dots */}
      <circle cx="28" cy="10" r="2.5" fill="white" fillOpacity="0.7" />
      <circle cx="10" cy="78" r="2.5" fill="white" fillOpacity="0.7" />
      <circle cx="174" cy="74" r="2.5" fill="white" fillOpacity="0.7" />
      <circle cx="196" cy="88" r="2.5" fill="white" fillOpacity="0.7" />
    </svg>
  );
}

/** SIGNALS card: two node circles connected with a crossing conflict line */
function IllustrationSignals() {
  return (
    <svg
      viewBox="0 0 200 150"
      fill="none"
      width="200"
      height="150"
      style={{ filter: "drop-shadow(0 0 6px rgba(255,255,255,0.35))" }}
      aria-hidden="true"
    >
      {/* Left node */}
      <circle cx="38" cy="75" r="18" stroke="white" strokeOpacity="0.7" strokeWidth="1" />
      <circle cx="38" cy="75" r="6"  fill="white" fillOpacity="0.5" />
      {/* Right node */}
      <circle cx="162" cy="75" r="18" stroke="white" strokeOpacity="0.7" strokeWidth="1" />
      <circle cx="162" cy="75" r="6"  fill="white" fillOpacity="0.5" />
      {/* Bull path (arcs up) */}
      <path d="M 56 68 Q 100 20 144 68" stroke="white" strokeOpacity="0.7" strokeWidth="1" />
      {/* Bear path (arcs down) */}
      <path d="M 56 82 Q 100 128 144 82" stroke="white" strokeOpacity="0.7" strokeWidth="1" />
      {/* Conflict X at center */}
      <line x1="92" y1="65" x2="108" y2="85" stroke="white" strokeOpacity="0.9" strokeWidth="1.5" />
      <line x1="108" y1="65" x2="92"  y2="85" stroke="white" strokeOpacity="0.9" strokeWidth="1.5" />
      <circle cx="100" cy="75" r="10" stroke="white" strokeOpacity="0.6" strokeWidth="1" />
      {/* Connecting traces off-edges */}
      <path d="M 20 75 H 0"  stroke="white" strokeOpacity="0.4" strokeWidth="1" />
      <path d="M 180 75 H 200" stroke="white" strokeOpacity="0.4" strokeWidth="1" />
    </svg>
  );
}

/** BIAS card: branching timeline traces representing diverging creator paths */
function IllustrationBias() {
  return (
    <svg
      viewBox="0 0 200 150"
      fill="none"
      width="200"
      height="150"
      style={{ filter: "drop-shadow(0 0 6px rgba(255,255,255,0.35))" }}
      aria-hidden="true"
    >
      {/* Main trunk */}
      <path d="M 10 75 H 70 Q 82 75 82 63 V 30" stroke="white" strokeOpacity="0.7" strokeWidth="1" />
      <path d="M 70 75 Q 82 75 82 87 V 120" stroke="white" strokeOpacity="0.7" strokeWidth="1" />
      {/* Upper branch continues */}
      <path d="M 82 30 Q 82 18 94 18 H 160 Q 172 18 172 30 V 55 Q 172 67 184 67 H 200" stroke="white" strokeOpacity="0.7" strokeWidth="1" />
      {/* Lower branch continues */}
      <path d="M 82 120 Q 82 132 94 132 H 160 Q 172 132 172 120 V 95 Q 172 83 184 83 H 200" stroke="white" strokeOpacity="0.7" strokeWidth="1" />
      {/* Tick marks on upper branch (bull) */}
      <line x1="110" y1="12" x2="110" y2="24" stroke="white" strokeOpacity="0.5" strokeWidth="1" />
      <line x1="140" y1="12" x2="140" y2="24" stroke="white" strokeOpacity="0.5" strokeWidth="1" />
      {/* Tick marks on lower branch (bear) */}
      <line x1="110" y1="126" x2="110" y2="138" stroke="white" strokeOpacity="0.5" strokeWidth="1" />
      <line x1="140" y1="126" x2="140" y2="138" stroke="white" strokeOpacity="0.5" strokeWidth="1" />
      {/* Origin dot */}
      <circle cx="10" cy="75" r="3" fill="white" fillOpacity="0.7" />
      {/* Branch node */}
      <circle cx="76" cy="75" r="5" stroke="white" strokeOpacity="0.7" strokeWidth="1" fill="none" />
    </svg>
  );
}

/** RECALL card: stacked layered rectangles with a query probe */
function IllustrationRecall() {
  return (
    <svg
      viewBox="0 0 200 150"
      fill="none"
      width="200"
      height="150"
      style={{ filter: "drop-shadow(0 0 6px rgba(255,255,255,0.35))" }}
      aria-hidden="true"
    >
      {/* Database stack — three layers */}
      <rect x="32" y="90" width="120" height="28" rx="3" stroke="white" strokeOpacity="0.65" strokeWidth="1" />
      <rect x="32" y="62" width="120" height="28" rx="3" stroke="white" strokeOpacity="0.55" strokeWidth="1" />
      <rect x="32" y="34" width="120" height="28" rx="3" stroke="white" strokeOpacity="0.40" strokeWidth="1" />
      {/* Data lines inside each layer */}
      <line x1="48" y1="104" x2="90"  y2="104" stroke="white" strokeOpacity="0.45" strokeWidth="0.75" />
      <line x1="48" y1="76"  x2="110" y2="76"  stroke="white" strokeOpacity="0.35" strokeWidth="0.75" />
      <line x1="48" y1="48"  x2="80"  y2="48"  stroke="white" strokeOpacity="0.25" strokeWidth="0.75" />
      {/* Query arrow entering from left */}
      <path d="M 0 75 H 32" stroke="white" strokeOpacity="0.7" strokeWidth="1" strokeDasharray="4 3" />
      <polygon points="28,71 36,75 28,79" fill="white" fillOpacity="0.7" />
      {/* Result trace leaving right */}
      <path d="M 152 75 H 186 Q 198 75 198 63 V 20" stroke="white" strokeOpacity="0.7" strokeWidth="1" />
      <circle cx="186" cy="20" r="3" fill="white" fillOpacity="0.7" />
    </svg>
  );
}

// ── Card data ─────────────────────────────────────────────────────────────────

const CARDS = [
  {
    tag: "GRAPH",
    title: "Living Knowledge Graph",
    desc: "Every video, article and note becomes typed nodes and edges — companies, theses, catalysts, creators — merged into one connected memory.",
    Illustration: IllustrationGraph,
  },
  {
    tag: "SIGNALS",
    title: "Contradiction Detection",
    desc: "When one creator's bull case collides with another's bear case, the graph flags it. Red edges mean someone is wrong — find out who.",
    Illustration: IllustrationSignals,
  },
  {
    tag: "BIAS",
    title: "Creator Bias Profiles",
    desc: "Permabulls and permabears reveal themselves over time. InvestorBrain tracks who said what, when, and how it aged.",
    Illustration: IllustrationBias,
  },
  {
    tag: "RECALL",
    title: "Ask Your Memory",
    desc: "Natural-language answers grounded in your own research trail. Bull case vs bear case, catalysts due this quarter, how your view evolved.",
    Illustration: IllustrationRecall,
  },
] as const;

// ── Component ─────────────────────────────────────────────────────────────────

export default function MemorySuite() {
  const { ref, visible, reduced } = useReveal();

  return (
    <div
      id="product"
      ref={ref}
      style={{ backgroundColor: "#050505" }}
      className="relative overflow-hidden py-32 lg:py-40"
    >
      {/* Responsive card rotation via scoped CSS */}
      <style>{`
        @media (min-width: 768px) {
          .ib-card-even { transform: rotate(-1.5deg); }
          .ib-card-odd  { transform: rotate( 1.5deg); }
        }
      `}</style>

      <div className="max-w-7xl mx-auto px-5 lg:px-16">

        {/* ── Top row ────────────────────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-10 mb-16">

          {/* Heading */}
          <h2
            style={{
              fontFamily: "var(--font-geist-sans)",
              fontSize: "clamp(36px, 5.5vw, 72px)",
              fontWeight: 600,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              color: "#ffffff",
              ...rv(visible, reduced, 0),
            }}
          >
            Memory
            <br />
            Suite
          </h2>

          {/* Right: description + CTA */}
          <div
            className="max-w-sm"
            style={rv(visible, reduced, 100)}
          >
            <p
              style={{
                fontFamily: "var(--font-geist-sans)",
                fontSize: "14px",
                lineHeight: 1.75,
                color: "rgba(255,255,255,0.6)",
                marginBottom: "1.5rem",
              }}
            >
              A complete memory layer for your investment research. Every source
              you feed it becomes structured, connected, and permanently
              queryable.
            </p>

            {/* Button-in-button — white variant on dark bg */}
            <Link
              href="/signin"
              className="group inline-flex items-center rounded-[6px] bg-white overflow-hidden cursor-pointer select-none active:scale-[0.98]"
              style={{ transition: `transform 200ms ${EASE}` }}
            >
              <span
                className="h-[42px] flex items-center px-5 text-[13px] font-semibold whitespace-nowrap"
                style={{ color: "#050505" }}
              >
                Get Started
              </span>
              <span
                className="w-[42px] h-[42px] flex-shrink-0 flex items-center justify-center group-hover:translate-x-[1px] group-hover:-translate-y-[1px]"
                style={{
                  background: "#1d3be0",
                  transition: `transform 300ms ${EASE}`,
                }}
              >
                <span className="text-white text-[15px] leading-none">↗</span>
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Cards row (horizontal scroll) ─────────────────────────────────── */}
      <div
        className="flex gap-5 overflow-x-auto snap-x snap-mandatory pl-5 lg:pl-[calc((100vw-80rem)/2+4rem)] pr-5 pb-4"
        style={{
          msOverflowStyle: "none",
          scrollbarWidth: "none",
        } as CSSProperties}
      >
        <style>{`
          .ib-cards-track::-webkit-scrollbar { display: none; }
        `}</style>

        {CARDS.map(({ tag, title, desc, Illustration }, i) => (
          <div
            key={tag}
            className={`ib-card-${i % 2 === 0 ? "even" : "odd"} flex-shrink-0 w-[340px] h-[420px] rounded-lg snap-start flex flex-col p-5 cursor-default`}
            style={{
              background: "linear-gradient(160deg, #2447f0 0%, #12279d 100%)",
              ...rv(visible, reduced, i * 80),
            }}
          >
            {/* Top row: category tag + arrow box */}
            <div className="flex justify-between items-start mb-4">
              <span
                className="rounded-full px-2.5 py-1 bg-white"
                style={{
                  fontFamily: "var(--font-geist-mono)",
                  fontSize: "12px",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#050505",
                  fontWeight: 600,
                }}
              >
                {tag}
              </span>
              <span
                className="w-7 h-7 flex items-center justify-center rounded-[4px] text-white text-xs"
                style={{ border: "1px solid rgba(255,255,255,0.3)" }}
              >
                ↗
              </span>
            </div>

            {/* Circuit illustration */}
            <div className="flex-1 flex items-center justify-center py-3">
              <Illustration />
            </div>

            {/* Card title + description */}
            <div className="mt-2">
              <p
                className="mb-2"
                style={{
                  fontFamily: "var(--font-geist-sans)",
                  fontSize: "17px",
                  fontWeight: 600,
                  color: "#ffffff",
                  lineHeight: 1.3,
                }}
              >
                {title}
              </p>
              <p
                style={{
                  fontFamily: "var(--font-geist-sans)",
                  fontSize: "12px",
                  lineHeight: 1.65,
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                {desc}
              </p>
            </div>
          </div>
        ))}

        {/* Trailing spacer so last card doesn't sit flush right */}
        <div className="flex-shrink-0 w-5 lg:w-16" aria-hidden="true" />
      </div>
    </div>
  );
}
