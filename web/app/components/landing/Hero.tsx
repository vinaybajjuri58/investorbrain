"use client";

import Link from "next/link";

// ── All graph positions precomputed at module level ──────────────────────────
// Deterministic — no Math.random() at render time, avoiding SSR hydration mismatch.

const GOLDEN = 137.508 * (Math.PI / 180); // golden angle in radians
const DEG2RAD = Math.PI / 180;

type BurstLine = { x2: number; y2: number; opacity: number };
const BURST_LINES: BurstLine[] = Array.from({ length: 52 }, (_, i) => {
  const angle = i * GOLDEN;
  const r = 80 + ((i * 53) % 180);
  const opacity = parseFloat((0.09 + (i % 7) * 0.024).toFixed(3));
  return {
    x2: parseFloat((320 + Math.cos(angle) * r).toFixed(2)),
    y2: parseFloat((320 + Math.sin(angle) * r).toFixed(2)),
    opacity,
  };
});

// Small dot markers at every 6th burst line endpoint
const DOT_MARKERS = BURST_LINES.filter((_, i) => i % 6 === 0);

// Labeled stock nodes
const TICKERS = [
  { id: "nvda", label: "NVDA", cx: 295, cy: 172 },
  { id: "tsla", label: "TSLA", cx: 458, cy: 242 },
  { id: "aapl", label: "AAPL", cx: 215, cy: 282 },
  { id: "pltr", label: "PLTR", cx: 390, cy: 385 },
] as const;

const CREATORS = [
  { id: "ca", label: "@creator_a", cx: 160, cy: 352 },
  { id: "cb", label: "@creator_b", cx: 492, cy: 168 },
] as const;

// Highlighted semantic edges
const GREEN_EDGES = [
  { x1: 295, y1: 172, x2: 458, y2: 242, midX: 377, midY: 200 },  // NVDA→TSLA
  { x1: 458, y1: 242, x2: 390, y2: 385, midX: 436, midY: 313 },  // TSLA→PLTR
] as const;

const RED_EDGE = { x1: 215, y1: 282, x2: 295, y2: 172, midX: 246, midY: 222 };

// Center → ticker edges (neutral connective tissue)
const CENTER_EDGES = TICKERS.map(({ cx, cy }) => ({
  x2: cx,
  y2: cy,
}));

// Perimeter micro-labels (positions precomputed from angle + radius)
const PERIMETER_DEFS = [
  { label: "INGEST...",   angle: 22,  r: 238 },
  { label: "EXTRACT...", angle: 112, r: 238 },
  { label: "CONNECT...", angle: 202, r: 238 },
  { label: "RECALL...",  angle: 292, r: 238 },
];
const PERIMETER = PERIMETER_DEFS.map(({ label, angle, r }) => ({
  label,
  x: parseFloat((320 + Math.cos(angle * DEG2RAD) * r).toFixed(1)),
  y: parseFloat((320 + Math.sin(angle * DEG2RAD) * r).toFixed(1)),
}));

// ── Button-in-button CTA ─────────────────────────────────────────────────────
function CtaButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center rounded-[6px] bg-white overflow-hidden cursor-pointer select-none active:scale-[0.98]"
      style={{ transition: "transform 200ms cubic-bezier(0.32,0.72,0,1)" }}
    >
      <span className="h-[52px] flex items-center px-6 text-[15px] font-semibold text-[#111] whitespace-nowrap">
        {label}
      </span>
      <span
        className="w-[52px] h-[52px] flex-shrink-0 flex items-center justify-center group-hover:translate-x-[1px] group-hover:-translate-y-[1px]"
        style={{
          background: "#1d3be0",
          transition: "transform 200ms cubic-bezier(0.32,0.72,0,1)",
        }}
      >
        <span className="text-white text-[18px] leading-none">↗</span>
      </span>
    </Link>
  );
}

// ── Graph SVG ────────────────────────────────────────────────────────────────
function GraphVisualization() {
  return (
    <svg
      viewBox="0 0 640 640"
      width="100%"
      aria-hidden
      style={{ display: "block" }}
    >
      {/* CSS animations scoped to this SVG */}
      <style>{`
        @keyframes ib-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes ib-pulse {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.18); }
        }
        @keyframes ib-breathe {
          0%, 100% { opacity: 0.18; }
          50%       { opacity: 0.55; }
        }
        @keyframes ib-node-glow {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.12); }
        }
        .ib-burst {
          transform-origin: 320px 320px;
          animation: ib-spin 60s linear infinite;
        }
        .ib-edge-green { animation: ib-breathe 4s ease-in-out infinite; }
        .ib-edge-red   { animation: ib-breathe 5s ease-in-out infinite 1s; }
        .ib-node-a { transform-origin: 295px 172px; animation: ib-node-glow 3s ease-in-out infinite 0s; }
        .ib-node-b { transform-origin: 458px 242px; animation: ib-node-glow 3s ease-in-out infinite 0.6s; }
        .ib-node-c { transform-origin: 215px 282px; animation: ib-node-glow 3s ease-in-out infinite 1.2s; }
        .ib-node-d { transform-origin: 390px 385px; animation: ib-node-glow 3s ease-in-out infinite 1.8s; }
        @media (prefers-reduced-motion: reduce) {
          .ib-burst, .ib-edge-green, .ib-edge-red,
          .ib-node-a, .ib-node-b, .ib-node-c, .ib-node-d {
            animation: none;
          }
        }
      `}</style>

      {/* ── ROTATING LAYER: ring + golden-angle burst ── */}
      <g className="ib-burst">
        {/* Dashed outer ring boundary */}
        <circle
          cx="320" cy="320" r="278"
          fill="none"
          stroke="white"
          strokeWidth="1.2"
          strokeDasharray="2.5 9"
          strokeOpacity="0.32"
        />
        {/* Radial burst lines */}
        {BURST_LINES.map((line, i) => (
          <line
            key={i}
            x1="320" y1="320"
            x2={line.x2} y2={line.y2}
            stroke="white"
            strokeWidth="0.7"
            strokeOpacity={line.opacity}
          />
        ))}
        {/* Small endpoint dots at every 6th line */}
        {DOT_MARKERS.map((dot, i) => (
          <circle
            key={i}
            cx={dot.x2} cy={dot.y2}
            r="1.8"
            fill="white"
            fillOpacity="0.28"
          />
        ))}
      </g>

      {/* ── STATIC LAYER: semantic graph ── */}
      <g>
        {/* Neutral center → ticker edges */}
        {CENTER_EDGES.map((e, i) => (
          <line
            key={i}
            x1="320" y1="320"
            x2={e.x2} y2={e.y2}
            stroke="white"
            strokeWidth="0.8"
            strokeOpacity="0.2"
          />
        ))}

        {/* GREEN "SUPPORTS" edges */}
        {GREEN_EDGES.map((e, i) => (
          <line
            key={i}
            className="ib-edge-green"
            x1={e.x1} y1={e.y1}
            x2={e.x2} y2={e.y2}
            stroke="#4ade80"
            strokeWidth="1.5"
            strokeOpacity="0.85"
          />
        ))}

        {/* RED "CONTRADICTS" dashed edge */}
        <line
          className="ib-edge-red"
          x1={RED_EDGE.x1} y1={RED_EDGE.y1}
          x2={RED_EDGE.x2} y2={RED_EDGE.y2}
          stroke="#f87171"
          strokeWidth="1.5"
          strokeDasharray="5 4"
          strokeOpacity="0.85"
        />

        {/* Edge labels */}
        {GREEN_EDGES.map((e, i) => (
          <text
            key={i}
            x={e.midX} y={e.midY - 5}
            textAnchor="middle"
            fill="#4ade80"
            fontSize="7.5"
            fontFamily="var(--font-geist-mono, monospace)"
            letterSpacing="0.12em"
            fillOpacity="0.9"
          >
            SUPPORTS
          </text>
        ))}
        <text
          x={RED_EDGE.midX - 5} y={RED_EDGE.midY - 5}
          textAnchor="end"
          fill="#f87171"
          fontSize="7.5"
          fontFamily="var(--font-geist-mono, monospace)"
          letterSpacing="0.12em"
          fillOpacity="0.9"
        >
          CONTRADICTS
        </text>

        {/* Central hub node */}
        <circle cx="320" cy="320" r="7" fill="white" fillOpacity="0.15" />
        <circle cx="320" cy="320" r="4" fill="white" fillOpacity="0.6" />

        {/* Ticker nodes */}
        <circle cx={TICKERS[0].cx} cy={TICKERS[0].cy} r="5.5" fill="white" className="ib-node-a" />
        <circle cx={TICKERS[1].cx} cy={TICKERS[1].cy} r="5.5" fill="white" className="ib-node-b" />
        <circle cx={TICKERS[2].cx} cy={TICKERS[2].cy} r="5.5" fill="white" className="ib-node-c" />
        <circle cx={TICKERS[3].cx} cy={TICKERS[3].cy} r="5.5" fill="white" className="ib-node-d" />

        {TICKERS.map(({ id, label, cx, cy }) => (
          <text
            key={id}
            x={cx + 9} y={cy + 4}
            fill="white"
            fontSize="9"
            fontFamily="var(--font-geist-mono, monospace)"
            fontWeight="600"
            letterSpacing="0.08em"
            fillOpacity="0.9"
          >
            {label}
          </text>
        ))}

        {/* Creator nodes (smaller, dimmer) */}
        {CREATORS.map(({ id, cx, cy }) => (
          <circle key={id} cx={cx} cy={cy} r="3.5" fill="white" fillOpacity="0.6" />
        ))}
        {CREATORS.map(({ id, label, cx, cy }) => (
          <text
            key={id}
            x={cx + 7} y={cy + 3}
            fill="white"
            fontSize="7.5"
            fontFamily="var(--font-geist-mono, monospace)"
            letterSpacing="0.06em"
            fillOpacity="0.55"
          >
            {label}
          </text>
        ))}

        {/* Perimeter floating micro-labels */}
        {PERIMETER.map(({ label, x, y }) => (
          <text
            key={label}
            x={x} y={y}
            textAnchor="middle"
            fill="white"
            fontSize="8"
            fontFamily="var(--font-geist-mono, monospace)"
            letterSpacing="0.2em"
            fillOpacity="0.4"
          >
            {label}
          </text>
        ))}
      </g>
    </svg>
  );
}

// ── Hero section ─────────────────────────────────────────────────────────────
interface HeroProps {
  isAuthed: boolean;
}

export default function Hero({ isAuthed }: HeroProps) {
  return (
    <section
      className="relative overflow-hidden min-h-[100dvh] flex flex-col"
      style={{
        background:
          "radial-gradient(ellipse 120% 90% at 50% 40%, #1d3be0 0%, #1835cc 55%, #152dbb 100%)",
      }}
    >
      {/* Subtle edge-deepening vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 60% at 50% 50%, transparent 40%, rgba(14,22,100,0.35) 100%)",
        }}
      />

      {/* ── Centered graph visualization ── */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          style={{ width: "min(640px, 88vw)", opacity: 0.92 }}
        >
          <GraphVisualization />
        </div>
      </div>

      {/* ── Bottom content row ── */}
      <div className="relative z-10 mt-auto flex items-end justify-between px-8 pb-12 md:px-14 md:pb-16 pt-36 gap-6">

        {/* Bottom-left: heading + CTA */}
        <div
          className="animate-[ib-hero-enter_800ms_cubic-bezier(0.32,0.72,0,1)_forwards]"
        >
          <style>{`
            @keyframes ib-hero-enter {
              from { opacity: 0; transform: translateY(24px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>

          {/* Micro-label above heading */}
          <p
            className="mb-4 text-white/55"
            style={{
              fontFamily: "var(--font-geist-mono, monospace)",
              fontSize: "12px",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
            }}
          >
            Cognee-powered · bias-aware
          </p>

          {/* Massive heading */}
          <h1
            className="text-white font-[550] tracking-[-0.03em] leading-[1.02] mb-8"
            style={{
              fontFamily: "var(--font-geist-sans, sans-serif)",
              fontSize: "clamp(44px, 7vw, 92px)",
            }}
          >
            Your Bias-Aware
            <br />
            Investing Memory
          </h1>

          {/* CTA */}
          {isAuthed ? (
            <CtaButton href="/dashboard" label="Open Dashboard" />
          ) : (
            <CtaButton href="/signin" label="Get Started" />
          )}
        </div>

        {/* Bottom-right: scroll cue */}
        <div
          className="flex-shrink-0 self-end mb-1 hidden sm:block"
          style={{
            opacity: 0.55,
            transition: "opacity 800ms cubic-bezier(0.32,0.72,0,1) 400ms",
          }}
        >
          <span
            className="text-white block"
            style={{
              fontFamily: "var(--font-geist-mono, monospace)",
              fontSize: "12px",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              writingMode: "vertical-rl",
              transform: "rotate(180deg)",
            }}
          >
            Scroll Down
          </span>
        </div>
      </div>
    </section>
  );
}
