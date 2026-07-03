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

// Must be at module level, not inside a component — Next.js/Turbopack requirement
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ForceGraph2D = dynamic<any>(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <span className="text-[#6e7681] text-sm font-mono">Loading graph…</span>
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

// ------- node type → colour mapping -------
const TYPE_COLOURS: Record<string, string> = {
  company: "#3b82f6",
  thesis: "#22c55e",
  creator: "#a855f7",
  catalyst: "#f97316",
  bias: "#ef4444",
  source: "#64748b",
  sectortheme: "#14b8a6",
  note: "#eab308",
  other: "#6b7280",
};

const LEGEND_LABELS: Record<string, string> = {
  company: "Company",
  thesis: "Thesis",
  creator: "Creator",
  catalyst: "Catalyst",
  bias: "Bias",
  source: "Source",
  sectortheme: "SectorTheme",
  note: "Note",
  other: "Other",
};

function typeKey(raw: string): string {
  const k = (raw ?? "").toLowerCase().replace(/[^a-z]/g, "");
  return k in TYPE_COLOURS ? k : "other";
}

function nodeColour(raw: string): string {
  return TYPE_COLOURS[typeKey(raw)] ?? TYPE_COLOURS.other;
}

// ------- link helpers -------
function getLinkLabel(link: unknown): string {
  return (
    (link as { label?: string; __label?: string }).label ??
    (link as { __label?: string }).__label ??
    ""
  );
}

// ------- component -------
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

  // Track container size via ResizeObserver
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

  // ZoomToFit when nodes first appear, reset flag when graph changes
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

  // Degree map (for node sizing)
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

  // Node types actually present in graph (for legend)
  const usedTypes = useMemo(() => {
    const present = new Set(graphData.nodes.map((n) => typeKey(n.type)));
    return Object.keys(TYPE_COLOURS).filter((k) => present.has(k));
  }, [graphData.nodes]);

  // ---- canvas callbacks (stable refs) ----
  const nodeCanvasObject = useCallback(
    (
      node: GraphNode,
      ctx: CanvasRenderingContext2D,
      globalScale: number
    ) => {
      const n = node as GraphNode & { x: number; y: number };
      const deg = degreeMap[String(n.id ?? "")] ?? 1;
      const r = Math.max(4, Math.min(15, 4 + deg * 0.75));
      const colour = nodeColour(n.type ?? "");

      // Glow ring
      ctx.shadowBlur = 18;
      ctx.shadowColor = colour;

      // Main circle
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, 2 * Math.PI);
      ctx.fillStyle = colour;
      ctx.fill();

      // Specular highlight
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(n.x - r * 0.28, n.y - r * 0.3, r * 0.32, 0, 2 * Math.PI);
      ctx.fillStyle = "rgba(255,255,255,0.28)";
      ctx.fill();

      // Label (zoom-dependent)
      if (globalScale >= 1.3) {
        const text = String(n.label ?? n.id ?? "").slice(0, 26);
        const fs = Math.max(7, 9 / globalScale);
        ctx.font = `${fs}px var(--font-geist-sans, sans-serif)`;
        ctx.fillStyle = "rgba(230,237,243,0.88)";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(text, n.x, n.y + r + 2);
      }
    },
    [degreeMap]
  );

  const nodePointerAreaPaint = useCallback(
    (
      node: GraphNode,
      paintColour: string,
      ctx: CanvasRenderingContext2D
    ) => {
      const n = node as GraphNode & { x: number; y: number };
      const deg = degreeMap[String(n.id ?? "")] ?? 1;
      const r = Math.max(4, Math.min(15, 4 + deg * 0.75));
      ctx.beginPath();
      ctx.arc(n.x, n.y, r + 3, 0, 2 * Math.PI);
      ctx.fillStyle = paintColour;
      ctx.fill();
    },
    [degreeMap]
  );

  const onRenderFramePre = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const { width, height } = ctx.canvas;
      // Radial gradient background
      const cx = width / 2;
      const cy = height / 2;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(cx, cy));
      grad.addColorStop(0, "#0c1a2e");
      grad.addColorStop(0.6, "#090e18");
      grad.addColorStop(1, "#070b12");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Subtle grid
      ctx.strokeStyle = "rgba(255,255,255,0.022)";
      ctx.lineWidth = 0.5;
      const gs = 48;
      for (let x = 0; x <= width; x += gs) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += gs) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    },
    []
  );

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelected({
      id: String(node.id),
      label: node.label || String(node.id),
      type: node.type || "Unknown",
    });
  }, []);

  const handleBgClick = useCallback(() => setSelected(null), []);

  const isEmpty = graphData.nodes.length === 0;

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#070b12]">
      <div ref={containerRef} className="w-full h-full">
        {isEmpty ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4 select-none pointer-events-none"
               style={{ background: "radial-gradient(ellipse at 50% 50%, #0c1829 0%, #070b12 70%)" }}>
            {/* Ghost graph icon */}
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" className="opacity-20">
              <circle cx="32" cy="32" r="8" stroke="#58a6ff" strokeWidth="1.5" />
              <circle cx="10" cy="54" r="5" stroke="#58a6ff" strokeWidth="1.5" />
              <circle cx="54" cy="54" r="5" stroke="#58a6ff" strokeWidth="1.5" />
              <circle cx="54" cy="10" r="5" stroke="#58a6ff" strokeWidth="1.5" />
              <circle cx="10" cy="10" r="5" stroke="#58a6ff" strokeWidth="1.5" />
              <line x1="25.5" y1="37" x2="14" y2="50" stroke="#58a6ff" strokeWidth="1" strokeOpacity="0.6" />
              <line x1="38.5" y1="37" x2="51" y2="50" stroke="#58a6ff" strokeWidth="1" strokeOpacity="0.6" />
              <line x1="38.5" y1="27" x2="51" y2="14" stroke="#58a6ff" strokeWidth="1" strokeOpacity="0.6" />
              <line x1="25.5" y1="27" x2="14" y2="14" stroke="#58a6ff" strokeWidth="1" strokeOpacity="0.6" />
            </svg>
            <p className="text-[#6e7681] text-sm">
              Nothing remembered yet — feed me a video or article.
            </p>
          </div>
        ) : (
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            width={dims.width}
            height={dims.height}
            backgroundColor="#070b12"
            nodeLabel={(n: GraphNode) => n.label || String(n.id)}
            nodeCanvasObject={nodeCanvasObject}
            nodeCanvasObjectMode={() => "replace"}
            nodePointerAreaPaint={nodePointerAreaPaint}
            /* Link colours */
            linkColor={(lk: unknown) => {
              const label = getLinkLabel(lk);
              if (label === "CONTRADICTS") return "#ef4444";
              if (label === "SUPPORTS") return "#22c55e";
              return "#253040";
            }}
            linkWidth={(lk: unknown) => {
              const label = getLinkLabel(lk);
              if (label === "CONTRADICTS") return 2.5;
              if (label === "SUPPORTS") return 1.8;
              return 1;
            }}
            linkLineDash={(lk: unknown) =>
              getLinkLabel(lk) === "CONTRADICTS" ? [5, 3] : null
            }
            /* Directional particles for alive feel */
            linkDirectionalParticles={2}
            linkDirectionalParticleColor={(lk: unknown) => {
              const label = getLinkLabel(lk);
              if (label === "CONTRADICTS") return "#ef4444";
              if (label === "SUPPORTS") return "#22c55e";
              return "#3b4a5e";
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

      {/* Node click card */}
      {selected && (
        <div
          className="absolute top-3 left-3 bg-[#161b22] border border-[#30363d] rounded-xl p-4 max-w-[230px] shadow-2xl z-20"
          style={{ backdropFilter: "blur(10px)" }}
        >
          <button
            onClick={() => setSelected(null)}
            className="absolute top-2.5 right-2.5 w-5 h-5 flex items-center justify-center rounded text-[#6e7681] hover:text-[#e6edf3] hover:bg-[#21262d] transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path
                d="M1 1l8 8M9 1L1 9"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <p className="text-[10px] font-mono uppercase tracking-widest text-[#6e7681] mb-1">
            {selected.type}
          </p>
          <p className="font-semibold text-sm text-[#e6edf3] leading-snug pr-5">
            {selected.label}
          </p>
          <div
            className="mt-2.5 h-0.5 rounded-full"
            style={{ background: nodeColour(selected.type) }}
          />
        </div>
      )}

      {/* Bottom overlay: legend + refresh */}
      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between pointer-events-none">
        {/* Legend chips */}
        {usedTypes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 max-w-[65%]">
            {usedTypes.map((k) => (
              <div
                key={k}
                className="flex items-center gap-1 rounded px-1.5 py-0.5"
                style={{
                  background: "rgba(13,17,23,0.75)",
                  backdropFilter: "blur(6px)",
                }}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{
                    background: TYPE_COLOURS[k],
                    boxShadow: `0 0 5px ${TYPE_COLOURS[k]}99`,
                  }}
                />
                <span className="text-[10px] text-[#8b949e] font-mono">
                  {LEGEND_LABELS[k]}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          className="pointer-events-auto flex items-center gap-1.5 rounded-lg border border-[#30363d] px-3 py-1.5 text-[11px] text-[#8b949e] hover:text-[#e6edf3] hover:border-[#58a6ff44] transition-all"
          style={{ background: "rgba(22,27,34,0.8)", backdropFilter: "blur(6px)" }}
          title="Refresh graph"
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 11 11"
            fill="none"
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
