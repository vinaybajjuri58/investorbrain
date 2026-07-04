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
import GraphEmptyState from "@/app/components/GraphEmptyState";
import NodeDetailCard, { type SelectedNode } from "@/app/components/NodeDetailCard";
import GraphOverlay from "@/app/components/GraphOverlay";
import {
  type GraphNode,
  type GraphData,
  typeKey,
  nodeColour,
  TYPE_COLOURS,
} from "@/app/components/graphTypes";

export { typeKey, nodeColour };
export type { GraphNode, GraphLink, GraphData } from "@/app/components/graphTypes";

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

function getLinkLabel(link: unknown): string {
  return (
    (link as { label?: string; __label?: string }).label ??
    (link as { __label?: string }).__label ??
    ""
  );
}

interface Props {
  graphData: GraphData;
  isProcessing: boolean;
  onRefresh: () => void;
}

export default function GraphCanvas({
  graphData,
  isProcessing,
  onRefresh,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ForceGraphMethods | any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [dims, setDims] = useState({ width: 800, height: 600 });
  const [selected, setSelected] = useState<SelectedNode | null>(null);
  const prevNodeCount = useRef(0);
  const hasZoomedRef = useRef(false);

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

  const handleEngineStop = useCallback(() => {
    const n = graphData.nodes.length;
    if (n > 0 && prevNodeCount.current === 0) {
      hasZoomedRef.current = false;
    }
    prevNodeCount.current = n;
    if (n > 0 && !hasZoomedRef.current) {
      hasZoomedRef.current = true;
      graphRef.current?.zoomToFit(700, 48);
    }
  }, [graphData.nodes.length]);

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

  const usedTypes = useMemo(() => {
    const present = new Set(graphData.nodes.map((n) => typeKey(n.type)));
    return Object.keys(TYPE_COLOURS).filter((k) => present.has(k));
  }, [graphData.nodes]);

  const nodeCanvasObject = useCallback(
    (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const n = node as GraphNode & { x: number; y: number };
      const deg = degreeMap[String(n.id ?? "")] ?? 1;
      const r = Math.max(4, Math.min(16, 4 + deg * 0.8));
      const colour = nodeColour(n.type ?? "");

      ctx.shadowBlur = 22;
      ctx.shadowColor = colour + "bb";

      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, 2 * Math.PI);
      ctx.fillStyle = colour;
      ctx.fill();

      ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.arc(n.x - r * 0.28, n.y - r * 0.3, r * 0.32, 0, 2 * Math.PI);
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.fill();

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
    const cx = width / 2;
    const cy = height / 2;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(cx, cy));
    grad.addColorStop(0,   "#0a0f2a");
    grad.addColorStop(0.5, "#050505");
    grad.addColorStop(1,   "#050505");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

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
        {isEmpty ? (
          <GraphEmptyState />
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
            linkDirectionalParticles={2}
            linkDirectionalParticleColor={(lk: unknown) => {
              const lbl = getLinkLabel(lk);
              if (lbl === "CONTRADICTS") return "#ef4444";
              if (lbl === "SUPPORTS")    return "#22c55e";
              return "#26262c";
            }}
            linkDirectionalParticleSpeed={0.0045}
            linkDirectionalParticleWidth={2.5}
            onRenderFramePre={onRenderFramePre}
            onNodeClick={handleNodeClick}
            onBackgroundClick={handleBgClick}
            d3AlphaDecay={0.018}
            cooldownTicks={180}
            onEngineStop={handleEngineStop}
            showPointerCursor
          />
        )}
      </div>

      {selected && <NodeDetailCard selected={selected} onDismiss={() => setSelected(null)} />}

      <GraphOverlay usedTypes={usedTypes} isProcessing={isProcessing} onRefresh={onRefresh} />
    </div>
  );
}
