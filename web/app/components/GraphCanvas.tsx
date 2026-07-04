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
      <span className="text-[#4a5c6e] text-[12px] font-mono tracking-wider">
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
// Colours are vivid against the #080c14 navy base.
// Each type maps to a distinct hue — no two types share a hue family.
const TYPE_COLOURS: Record<string, string> = {
  company:     "#4f9cf9",   // sky-blue
  thesis:      "#22c55e",   // emerald (=SUPPORTS signal — intentional)
  creator:     "#a78bfa",   // violet
  catalyst:    "#fb923c",   // orange
  bias:        "#f87171",   // rose-red
  source:      "#64748b",   // slate
  sectortheme: "#2dd4bf",   // teal-cyan
  note:        "#fbbf24",   // amber-light (distinct from gold UI accent)
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
    // Deep navy radial gradient — matches UI chrome
    const cx = width / 2;
    const cy = height / 2;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(cx, cy));
    grad.addColorStop(0,   "#0d1829");
    grad.addColorStop(0.5, "#0a1020");
    grad.addColorStop(1,   "#080c14");
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
    <div className="relative w-full h-full overflow-hidden bg-[#080c14]">
      <div ref={containerRef} className="w-full h-full">

        {/* ── Empty state ── */}
        {isEmpty ? (
          <div
            className="w-full h-full flex flex-col items-center justify-center gap-5 select-none pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at 50% 50%, #0d1829 0%, #080c14 65%)",
            }}
          >
            {/* Ghost graph illustration */}
            <svg
              width="72"
              height="72"
              viewBox="0 0 72 72"
              fill="none"
              aria-hidden
              style={{ opacity: 0.18 }}
            >
              {/* Edges */}
              <line x1="36" y1="36" x2="12" y2="12" stroke="#f59e0b" strokeWidth="1.2" strokeLinecap="round"/>
              <line x1="36" y1="36" x2="60" y2="12" stroke="#f59e0b" strokeWidth="1.2" strokeLinecap="round"/>
              <line x1="36" y1="36" x2="12" y2="60" stroke="#f59e0b" strokeWidth="1.2" strokeLinecap="round"/>
              <line x1="36" y1="36" x2="60" y2="60" stroke="#f59e0b" strokeWidth="1.2" strokeLinecap="round"/>
              <line x1="36" y1="36" x2="36" y2="10" stroke="#f59e0b" strokeWidth="1"   strokeLinecap="round"/>
              {/* Satellite nodes */}
              <circle cx="12" cy="12" r="6" stroke="#22c55e" strokeWidth="1.5"/>
              <circle cx="60" cy="12" r="6" stroke="#4f9cf9" strokeWidth="1.5"/>
              <circle cx="12" cy="60" r="6" stroke="#ef4444" strokeWidth="1.5"/>
              <circle cx="60" cy="60" r="6" stroke="#a78bfa" strokeWidth="1.5"/>
              <circle cx="36" cy="10" r="4" stroke="#fbbf24" strokeWidth="1.2"/>
              {/* Centre */}
              <circle cx="36" cy="36" r="10" stroke="#f59e0b" strokeWidth="1.5"/>
              <circle cx="36" cy="36" r="5"  fill="#f59e0b" opacity="0.5"/>
            </svg>

            <div className="text-center space-y-1">
              <p className="text-[#7b97b5] text-[13px] font-medium">
                Your knowledge graph is empty
              </p>
              <p className="text-[#4a5c6e] text-[11.5px]">
                Add a YouTube video or article in the{" "}
                <span className="text-[#f59e0b]">Add Source</span> tab to get started.
              </p>
            </div>
          </div>
        ) : (
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            width={dims.width}
            height={dims.height}
            backgroundColor="#080c14"
            nodeLabel={(n: GraphNode) => n.label || String(n.id)}
            nodeCanvasObject={nodeCanvasObject}
            nodeCanvasObjectMode={() => "replace"}
            nodePointerAreaPaint={nodePointerAreaPaint}
            /* Link colours — CONTRADICTS alarming red, SUPPORTS affirming green */
            linkColor={(lk: unknown) => {
              const lbl = getLinkLabel(lk);
              if (lbl === "CONTRADICTS") return "#ef4444";
              if (lbl === "SUPPORTS")    return "#22c55e";
              return "#1c2a3f";
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
              return "#253548";
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
          className="absolute top-3 left-3 z-20 p-[5px] rounded-[14px] bg-[#0d1320] border border-[#1c2a3f]"
          style={{ backdropFilter: "blur(12px)" }}
        >
          {/* Inner core */}
          <div
            className="relative bg-[#111928] rounded-[10px] px-4 pt-3.5 pb-3 max-w-[220px]"
            style={{
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
            }}
          >
            {/* Close button */}
            <button
              onClick={() => setSelected(null)}
              aria-label="Dismiss node detail"
              className="absolute top-2.5 right-2.5 w-5 h-5 flex items-center justify-center rounded text-[#4a5c6e] hover:text-[#e4edf8] hover:bg-[#162035] transition-colors duration-150 cursor-pointer"
            >
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden>
                <path d="M1 1l7 7M8 1L1 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </button>

            {/* Node type label */}
            <p
              className="text-[9.5px] font-mono uppercase tracking-[0.14em] text-[#4a5c6e] mb-1"
            >
              {selected.type}
            </p>

            {/* Node label */}
            <p className="font-semibold text-[13px] text-[#e4edf8] leading-snug pr-5 text-wrap-balance">
              {selected.label}
            </p>

            {/* Colour accent stripe */}
            <div
              className="mt-3 h-[2px] rounded-full"
              style={{ background: nodeColour(selected.type) }}
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
                  background: "rgba(8,12,20,0.82)",
                  border: "1px solid rgba(255,255,255,0.06)",
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
                <span className="text-[9.5px] font-mono text-[#7b97b5]">
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
          className="pointer-events-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium text-[#7b97b5] hover:text-[#e4edf8] hover:border-[#f59e0b44] active:scale-95 transition-all duration-150 cursor-pointer"
          style={{
            background:     "rgba(8,12,20,0.82)",
            border:         "1px solid rgba(37,53,72,0.8)",
            backdropFilter: "blur(8px)",
          }}
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
