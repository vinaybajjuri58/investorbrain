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

// Pipeline stage labels placed along the circuit traces.
const STAGE_LABELS: Array<{ text: string; left: string; top: string }> = [
  { text: "INGEST",  left: "7%",  top: "22%" },
  { text: "EXTRACT", left: "36%", top: "62%" },
  { text: "CONNECT", left: "60%", top: "28%" },
  { text: "RECALL",  left: "78%", top: "72%" },
];

export default function ClosingCta() {
  const { ref, visible, reduced } = useReveal();

  return (
    <div
      id="memory"
      ref={ref}
      className="relative overflow-hidden py-36 lg:py-48 px-5 lg:px-16"
      style={{ backgroundColor: "#ffffff" }}
    >
      {/* ── Circuit-trace background ─────────────────────────────────────── */}
      <svg
        aria-hidden="true"
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 1440 600"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Trace A: from left, steps down, continues right */}
        <path
          d="M -10 120 H 248 Q 260 120 260 132 V 188 Q 260 200 272 200 H 1450"
          stroke="#1d3be0"
          strokeOpacity="0.3"
          strokeWidth="1"
        />
        {/* Trace B: from top-right, steps left, continues down */}
        <path
          d="M 1200 -10 V 268 Q 1200 280 1188 280 H 1072 Q 1060 280 1060 292 V 610"
          stroke="#1d3be0"
          strokeOpacity="0.3"
          strokeWidth="1"
        />
        {/* Trace C: from right, steps up, continues left off-screen */}
        <path
          d="M 1450 450 H 792 Q 780 450 780 438 V 392 Q 780 380 768 380 H -10"
          stroke="#1d3be0"
          strokeOpacity="0.3"
          strokeWidth="1"
        />
        {/* Trace D: short vertical accent */}
        <path
          d="M 440 -10 V 100 Q 440 112 452 112 H 580 Q 592 112 592 124 V 250"
          stroke="#1d3be0"
          strokeOpacity="0.15"
          strokeWidth="1"
        />
      </svg>

      {/* ── Pipeline labels along traces ─────────────────────────────────── */}
      {STAGE_LABELS.map(({ text, left, top }) => (
        <span
          key={text}
          className="absolute pointer-events-none select-none"
          style={{
            left,
            top,
            fontFamily: "var(--font-geist-mono)",
            fontSize: "12px",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "rgba(29,59,224,0.6)",
          }}
        >
          {text}
        </span>
      ))}

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="max-w-2xl">

          {/* Eyebrow */}
          <p
            className="uppercase mb-6"
            style={{
              fontFamily: "var(--font-geist-mono)",
              fontSize: "12px",
              letterSpacing: "0.2em",
              color: "rgba(29,59,224,0.7)",
              ...rv(visible, reduced, 0),
            }}
          >
            → START NOW
          </p>

          {/* Heading */}
          <h2
            style={{
              fontFamily: "var(--font-geist-sans)",
              fontSize: "clamp(36px, 5vw, 64px)",
              fontWeight: 600,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              color: "#1d3be0",
              marginBottom: "2.5rem",
              ...rv(visible, reduced, 100),
            }}
          >
            Start building your
            <br />
            investing memory
          </h2>

          {/* Button-in-button — blue variant on white bg */}
          <div style={rv(visible, reduced, 200)}>
            <Link
              href="/signin"
              className="group inline-flex items-center rounded-[6px] overflow-hidden cursor-pointer select-none active:scale-[0.98]"
              style={{
                backgroundColor: "#1d3be0",
                transition: `transform 200ms ${EASE}`,
              }}
            >
              <span
                className="h-[44px] flex items-center px-6 text-[14px] font-semibold text-white whitespace-nowrap"
              >
                Get Started
              </span>
              {/* Nested arrow box — white bg with blue arrow */}
              <span
                className="w-[44px] h-[44px] flex-shrink-0 flex items-center justify-center group-hover:translate-x-[1px] group-hover:-translate-y-[1px]"
                style={{
                  backgroundColor: "#ffffff",
                  borderLeft: "1px solid rgba(29,59,224,0.2)",
                  transition: `transform 300ms ${EASE}`,
                }}
              >
                <span
                  className="text-[15px] leading-none font-medium"
                  style={{ color: "#1d3be0" }}
                >
                  ↗
                </span>
              </span>
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
