"use client";

import {
  useRef,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import dynamic from "next/dynamic";
import type { ForceGraphMethods } from "react-force-graph-2d";

// Must be at module level — Next.js/Turbopack requirement
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ForceGraph2D = dynamic<any>(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <span className="text-[12px] font-mono tracking-wider" style={{ color: "rgba(255,255,255,0.25)" }}>
        Loading graph…
      </span>
    </div>
  ),
});

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  x?: number;
  y?: number;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  label: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// ── Node type → colour ──
// Colours are vivid against the #050505 black base.
// Each type maps to a distinct hue — no two types share a hue family.
const TYPE_COLOURS: Record<string, string> = {
  company:     "#4f9cf9",   // sky-blue
  thesis:      "#22c55e",   // emerald (=SUPPORTS signal — intentional)
  creator:     "#a78bfa",   // violet
  catalyst:    "#fb923c",   // orange
  bias:        "#f87171",   // rose-red
  source:      "#64748b",   // slate
  sectortheme: "#2dd4bf",   // teal-cyan
  note:        "#f59e0b",   // amber (kept distinct from the blue UI accent)
  other:       "#6b7280",   // cool-gray
};

const LEGEND_LABELS: Record<string, string> = {
  company:     "Company",
  thesis:      "Thesis",
  creator:     "Creator",
  catalyst:    "Catalyst",
  bias:        "Bias",
  source:      "Source",
  sectortheme: "Sector / Theme",
  note:        "Note",
  other:       "Other",
};

function typeKey(raw: string): string {
  const k = (raw ?? "").toLowerCase().replace(/[^a-z]/g, "");
  return k in TYPE_COLOURS ? k : "other";
}

function nodeColour(raw: string): string {
  return TYPE_COLOURS[typeKey(raw)] ?? TYPE_COLOURS.other;
}

// ── Link label helper ──
function getLinkLabel(link: unknown): string {
  return (
    (link as { label?: string; __label?: string }).label ??
    (link as { __label?: string }).__label ??
    ""
  );
}

// ── Component ──
interface Props {
  graphData: GraphData;
  isProcessing: boolean;
  onRefresh: () => void;
}

interface SelectedNode {
  id: string;
  label: string;
  type: string;
}

export default function GraphCanvas({
  graphData,
  isProcessing,
  onRefresh,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<ForceGraphMethods | any>(null);
  const [dims, setDims] = useState({ width: 800, height: 600 });
  const [selected, setSelected] = useState<SelectedNode | null>(null);
  const prevNodeCount = useRef(0);
  const hasZoomedRef = useRef(false);

  // Responsive sizing via ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) setDims({ width: r.width, height: r.height });
    });
    obs.observe(el);
    setDims({ width: el.clientWidth, height: el.clientHeight });
    return () => obs.disconnect();
  }, []);

  // ZoomToFit when nodes first appear
  useEffect(() => {
    const n = graphData.nodes.length;
    if (n > 0 && prevNodeCount.current === 0) {
      hasZoomedRef.current = false;
    }
    prevNodeCount.current = n;
  }, [graphData.nodes.length]);

  const handleEngineStop = useCallback(() => {
    if (graphData.nodes.length > 0 && !hasZoomedRef.current) {
      hasZoomedRef.current = true;
      graphRef.current?.zoomToFit(700, 48);
    }
  }, [graphData.nodes.length]);

  // Degree map for node sizing
  const degreeMap = useMemo<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    for (const lk of graphData.links) {
      const s =
        typeof lk.source === "object" && lk.source !== null
          ? String((lk.source as GraphNode).id ?? "")
          : String(lk.source ?? "");
      const t =
        typeof lk.target === "object" && lk.target !== null
          ? String((lk.target as GraphNode).id ?? "")
          : String(lk.target ?? "");
      if (s) m[s] = (m[s] ?? 0) + 1;
      if (t) m[t] = (m[t] ?? 0) + 1;
    }
    return m;
  }, [graphData.links]);

  // Node types present in graph (for legend)
  const usedTypes = useMemo(() => {
    const present = new Set(graphData.nodes.map((n) => typeKey(n.type)));
    return Object.keys(TYPE_COLOURS).filter((k) => present.has(k));
  }, [graphData.nodes]);

  // ── Canvas callbacks ──
  const nodeCanvasObject = useCallback(
    (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const n = node as GraphNode & { x: number; y: number };
      const deg = degreeMap[String(n.id ?? "")] ?? 1;
      const r = Math.max(4, Math.min(16, 4 + deg * 0.8));
      const colour = nodeColour(n.type ?? "");

      // Outer glow — same hue as node
      ctx.shadowBlur = 22;
      ctx.shadowColor = colour + "bb";

      // Main circle
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, 2 * Math.PI);
      ctx.fillStyle = colour;
      ctx.fill();

      ctx.shadowBlur = 0;

      // Inner highlight (specular)
      ctx.beginPath();
      ctx.arc(n.x - r * 0.28, n.y - r * 0.3, r * 0.32, 0, 2 * Math.PI);
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.fill();

      // Label — only at sufficient zoom
      if (globalScale >= 1.3) {
        const text = String(n.label ?? n.id ?? "").slice(0, 26);
        const fs = Math.max(7, 9 / globalScale);
        ctx.font = `500 ${fs}px var(--font-geist-sans, system-ui, sans-serif)`;
        ctx.fillStyle = "rgba(228,237,248,0.85)";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(text, n.x, n.y + r + 2);
      }
    },
    [degreeMap]
  );

  const nodePointerAreaPaint = useCallback(
    (node: GraphNode, paintColour: string, ctx: CanvasRenderingContext2D) => {
      const n = node as GraphNode & { x: number; y: number };
      const deg = degreeMap[String(n.id ?? "")] ?? 1;
      const r = Math.max(4, Math.min(16, 4 + deg * 0.8));
      ctx.beginPath();
      ctx.arc(n.x, n.y, r + 4, 0, 2 * Math.PI);
      ctx.fillStyle = paintColour;
      ctx.fill();
    },
    [degreeMap]
  );

  const onRenderFramePre = useCallback((ctx: CanvasRenderingContext2D) => {
    const { width, height } = ctx.canvas;
    // Radial gradient — royal blue tint at center, pure black outward
    const cx = width / 2;
    const cy = height / 2;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(cx, cy));
    grad.addColorStop(0,   "#0a0f2a");
    grad.addColorStop(0.5, "#050505");
    grad.addColorStop(1,   "#050505");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Subtle grid — barely visible at 2% opacity
    ctx.strokeStyle = "rgba(255,255,255,0.018)";
    ctx.lineWidth = 0.5;
    const gs = 52;
    for (let x = 0; x <= width; x += gs) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y <= height; y += gs) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }
  }, []);

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelected({
      id:    String(node.id),
      label: node.label || String(node.id),
      type:  node.type || "Unknown",
    });
  }, []);

  const handleBgClick = useCallback(() => setSelected(null), []);

  const isEmpty = graphData.nodes.length === 0;

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: "#050505" }}>
      <div ref={containerRef} className="w-full h-full">

        {/* ── Empty state ── */}
        {isEmpty ? (
          <div
            className="w-full h-full flex flex-col items-center justify-center gap-6 select-none pointer-events-none"
            style={{
              background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(29,59,224,0.06) 0%, #050505 65%)",
            }}
          >
            {/* Ghost graph with glow */}
            <div style={{ filter: "drop-shadow(0 0 20px rgba(29,59,224,0.25))" }}>
              <svg width="80" height="80" viewBox="0 0 72 72" fill="none" aria-hidden style={{ opacity: 0.45 }}>
                <line x1="36" y1="36" x2="12" y2="12" stroke="#1d3be0" strokeWidth="1" strokeLinecap="round"/>
                <line x1="36" y1="36" x2="60" y2="12" stroke="#1d3be0" strokeWidth="1" strokeLinecap="round"/>
                <line x1="36" y1="36" x2="12" y2="60" stroke="#1d3be0" strokeWidth="1" strokeLinecap="round"/>
                <line x1="36" y1="36" x2="60" y2="60" stroke="#1d3be0" strokeWidth="1" strokeLinecap="round"/>
                <line x1="36" y1="36" x2="36" y2="10" stroke="#1d3be0" strokeWidth="0.8" strokeLinecap="round"/>
                <circle cx="12" cy="12" r="5" stroke="#22c55e" strokeWidth="1.2" fill="rgba(34,197,94,0.08)"/>
                <circle cx="60" cy="12" r="5" stroke="#4f9cf9" strokeWidth="1.2" fill="rgba(79,156,249,0.08)"/>
                <circle cx="12" cy="60" r="5" stroke="#ef4444" strokeWidth="1.2" fill="rgba(239,68,68,0.08)"/>
                <circle cx="60" cy="60" r="5" stroke="#a78bfa" strokeWidth="1.2" fill="rgba(167,139,250,0.08)"/>
                <circle cx="36" cy="10" r="3.5" stroke="#1d3be0" strokeWidth="1"/>
                <circle cx="36" cy="36" r="9" stroke="#1d3be0" strokeWidth="1.2"/>
                <circle cx="36" cy="36" r="4.5" fill="#1d3be0" opacity="0.6"/>
                <circle cx="34" cy="34" r="1.5" fill="rgba(255,255,255,0.35)"/>
              </svg>
            </div>

            <div className="text-center space-y-2">
              <p
                className="text-[13px] font-semibold"
                style={{
                  color: "rgba(255,255,255,0.45)",
                  fontFamily: "var(--font-space-grotesk, var(--font-geist-sans))",
                }}
              >
                Knowledge graph empty
              </p>
              <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                Add a YouTube video or article in the{" "}
                <span style={{ color: "#4d68f5" }}>Add Source</span> tab.
              </p>
            </div>
          </div>
        ) : (
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            width={dims.width}
            height={dims.height}
            backgroundColor="#050505"
            nodeLabel={(n: GraphNode) => n.label || String(n.id)}
            nodeCanvasObject={nodeCanvasObject}
            nodeCanvasObjectMode={() => "replace"}
            nodePointerAreaPaint={nodePointerAreaPaint}
            /* Link colours — CONTRADICTS alarming red, SUPPORTS affirming green */
            linkColor={(lk: unknown) => {
              const lbl = getLinkLabel(lk);
              if (lbl === "CONTRADICTS") return "#ef4444";
              if (lbl === "SUPPORTS")    return "#22c55e";
              return "#1a1a1f";
            }}
            linkWidth={(lk: unknown) => {
              const lbl = getLinkLabel(lk);
              if (lbl === "CONTRADICTS") return 2.5;
              if (lbl === "SUPPORTS")    return 1.8;
              return 1;
            }}
            linkLineDash={(lk: unknown) =>
              getLinkLabel(lk) === "CONTRADICTS" ? [5, 3] : null
            }
            /* Directional particles */
            linkDirectionalParticles={2}
            linkDirectionalParticleColor={(lk: unknown) => {
              const lbl = getLinkLabel(lk);
              if (lbl === "CONTRADICTS") return "#ef4444";
              if (lbl === "SUPPORTS")    return "#22c55e";
              return "#26262c";
            }}
            linkDirectionalParticleSpeed={0.0045}
            linkDirectionalParticleWidth={2.5}
            /* Pre-frame background */
            onRenderFramePre={onRenderFramePre}
            /* Interaction */
            onNodeClick={handleNodeClick}
            onBackgroundClick={handleBgClick}
            /* Simulation */
            d3AlphaDecay={0.018}
            cooldownTicks={180}
            onEngineStop={handleEngineStop}
            showPointerCursor
          />
        )}
      </div>

      {/* ── Selected node card — double-bezel ── */}
      {selected && (
        <div
          className="absolute top-3 left-3 z-20 p-[5px] rounded-2xl"
          style={{
            background: "rgba(5,5,5,0.95)",
            border: "1px solid rgba(255,255,255,0.10)",
            backdropFilter: "blur(12px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          }}
        >
          <div
            className="relative rounded-[13px] px-4 pt-3.5 pb-3 max-w-[220px]"
            style={{
              background: "#0f0f12",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
            }}
          >
            <button
              onClick={() => setSelected(null)}
              aria-label="Dismiss node detail"
              className="absolute top-2.5 right-2.5 w-5 h-5 flex items-center justify-center rounded-md cursor-pointer"
              style={{
                color: "rgba(255,255,255,0.30)",
                transition: "color 150ms cubic-bezier(0.32,0.72,0,1), background 150ms cubic-bezier(0.32,0.72,0,1)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#ffffff"; e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.30)"; e.currentTarget.style.background = "transparent"; }}
            >
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden>
                <path d="M1 1l7 7M8 1L1 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </button>

            <p className="text-[9px] font-mono uppercase tracking-[0.16em] mb-1.5" style={{ color: "rgba(255,255,255,0.30)" }}>
              {selected.type}
            </p>

            <p className="font-semibold text-[13px] leading-snug pr-5" style={{ color: "#ffffff" }}>
              {selected.label}
            </p>

            <div
              className="mt-3 h-[2px] rounded-full"
              style={{ background: nodeColour(selected.type), boxShadow: `0 0 6px ${nodeColour(selected.type)}88` }}
            />
          </div>
        </div>
      )}

      {/* ── Bottom overlay: legend + refresh ── */}
      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between pointer-events-none">

        {/* Legend chips */}
        {usedTypes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 max-w-[65%]">
            {usedTypes.map((k) => (
              <div
                key={k}
                className="flex items-center gap-1.5 rounded-md px-2 py-1"
                style={{
                  background: "rgba(5,5,5,0.88)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{
                    background:  TYPE_COLOURS[k],
                    boxShadow:   `0 0 6px ${TYPE_COLOURS[k]}99`,
                  }}
                />
                <span
                  className="text-[9px] font-mono tracking-[0.08em]"
                  style={{ color: "rgba(255,255,255,0.40)" }}
                >
                  {LEGEND_LABELS[k]}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          aria-label="Refresh graph"
          className="pointer-events-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium active:scale-95 cursor-pointer"
          style={{
            background:     "rgba(5,5,5,0.85)",
            border:         "1px solid rgba(255,255,255,0.14)",
            backdropFilter: "blur(8px)",
            color:          "rgba(255,255,255,0.40)",
            transition:     "color 200ms cubic-bezier(0.32,0.72,0,1), border-color 200ms cubic-bezier(0.32,0.72,0,1)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#ffffff"; e.currentTarget.style.borderColor = "rgba(29,59,224,0.55)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.40)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)"; }}
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 11 11"
            fill="none"
            aria-hidden
            className={isProcessing ? "animate-spin" : ""}
          >
            <path
              d="M9.5 5.5A4 4 0 1 1 5.5 1.5"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
            <path
              d="M5.5 1.5L8 4M5.5 1.5l2.5-2.5"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {isProcessing ? "Refreshing…" : "Refresh"}
        </button>
      </div>
    </div>
  );
}
