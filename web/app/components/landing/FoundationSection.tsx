"use client";

import type { CSSProperties } from "react";
import { useReveal } from "./useReveal";

const EASE = "cubic-bezier(0.32,0.72,0,1)";

/** Build a staggered opacity+translateY reveal style. */
function rv(visible: boolean, reduced: boolean, delay = 0): CSSProperties {
  if (reduced) return {};
  return {
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(3rem)",
    transition: `opacity 800ms ${EASE} ${delay}ms, transform 800ms ${EASE} ${delay}ms`,
  };
}

export default function FoundationSection() {
  const { ref, visible, reduced } = useReveal();

  return (
    <div
      id="how"
      ref={ref}
      style={{ backgroundColor: "#1d3be0" }}
      className="relative overflow-hidden py-32 lg:py-40 px-5 lg:px-16"
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
        {/* Trace A: left→right, stepped up, continues right */}
        <path
          d="M -10 228 H 288 Q 300 228 300 216 V 112 Q 300 100 312 100 H 1450"
          stroke="white"
          strokeOpacity="0.25"
          strokeWidth="1"
        />
        {/* Trace B: top→down, stepped right, continues down */}
        <path
          d="M 820 -10 V 238 Q 820 250 832 250 H 948 Q 960 250 960 262 V 610"
          stroke="white"
          strokeOpacity="0.25"
          strokeWidth="1"
        />
        {/* Trace C: right→left, stepped up, continues left off-screen */}
        <path
          d="M 1450 418 H 1052 Q 1040 418 1040 406 V 322 Q 1040 310 1028 310 H -10"
          stroke="white"
          strokeOpacity="0.25"
          strokeWidth="1"
        />
        {/* Trace D: subtle accent trace near center-top */}
        <path
          d="M 480 -10 V 80 Q 480 92 492 92 H 678 Q 690 92 690 104 V 200"
          stroke="white"
          strokeOpacity="0.12"
          strokeWidth="1"
        />
      </svg>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-end">

          {/* Left: eyebrow + massive heading */}
          <div className="lg:col-span-7">
            <p
              className="uppercase mb-6"
              style={{
                fontFamily: "var(--font-geist-mono)",
                fontSize: "10px",
                letterSpacing: "0.2em",
                color: "rgba(255,255,255,0.7)",
                ...rv(visible, reduced, 0),
              }}
            >
              → FOUNDATION
            </p>

            <h2
              style={{
                fontFamily: "var(--font-geist-sans)",
                fontSize: "clamp(36px, 5.5vw, 72px)",
                fontWeight: 600,
                letterSpacing: "-0.03em",
                lineHeight: 1.05,
                color: "#ffffff",
                ...rv(visible, reduced, 100),
              }}
            >
              Built for How
              <br />
              Investors Research
            </h2>
          </div>

          {/* Right: sub-heading + description — offset to right half on desktop */}
          <div
            className="lg:col-span-4 lg:col-start-9"
            style={rv(visible, reduced, 200)}
          >
            <p
              style={{
                fontFamily: "var(--font-geist-sans)",
                fontSize: "clamp(20px, 1.8vw, 26px)",
                fontWeight: 500,
                lineHeight: 1.3,
                color: "#ffffff",
                marginBottom: "1rem",
              }}
            >
              From a YouTube video to queryable conviction
            </p>
            <p
              style={{
                fontFamily: "var(--font-geist-sans)",
                fontSize: "14px",
                lineHeight: 1.75,
                color: "rgba(255,255,255,0.75)",
              }}
            >
              Paste a video or article — InvestorBrain transcribes it, extracts
              companies, theses, catalysts and biases into a living knowledge
              graph. It remembers who said what, so contradictions surface
              instead of hiding in your watch history.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
