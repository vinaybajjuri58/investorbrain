"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { fetchJson } from "@/app/hooks/useApi";
import GraphCanvas, { type GraphData } from "@/app/components/GraphCanvas";
import AskPanel from "@/app/components/AskPanel";
import SourcePanel from "@/app/components/SourcePanel";
import MemoryPanel from "@/app/components/MemoryPanel";
import StatusDot, { type ProcessingStatus } from "@/app/components/StatusDot";

// -------- status helpers --------
function parseStatus(data: unknown): ProcessingStatus {
  if (
    !data ||
    typeof data !== "object" ||
    Object.keys(data as object).length === 0
  ) {
    return "idle";
  }
  const str = JSON.stringify(data);
  if (str.includes("_INITIATED") || str.includes("_STARTED"))
    return "processing";
  if (str.includes("COMPLETED")) return "completed";
  return "idle";
}

type Tab = "ask" | "add" | "memory";

const TAB_LABELS: Record<Tab, string> = {
  ask: "Ask",
  add: "Add Source",
  memory: "Memory",
};

// -------- Dashboard --------
export default function Dashboard() {
  const [graphData, setGraphData] = useState<GraphData>({
    nodes: [],
    links: [],
  });
  const [status, setStatus] = useState<ProcessingStatus>("idle");
  const [activeTab, setActiveTab] = useState<Tab>("ask");
  const [refreshTick, setRefreshTick] = useState(0);

  // Stable fetchGraph — won't change between renders
  const fetchGraph = useCallback(async () => {
    try {
      const data = await fetchJson<GraphData>("/api/graph");
      if (data.nodes) setGraphData(data);
    } catch {
      // ignore — Cognee may not be running yet
    }
  }, []);

  // Initial fetch + manual refresh
  useEffect(() => {
    fetchGraph();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchGraph, refreshTick]);

  // Poll /api/status every 5 s
  useEffect(() => {
    let cancelled = false;

    async function pollStatus() {
      try {
        const data = await fetchJson<unknown>("/api/status");
        if (!cancelled) setStatus(parseStatus(data));
      } catch {
        // ignore
      }
    }

    pollStatus();
    const id = setInterval(pollStatus, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Poll /api/graph every 8 s while processing
  const processingRef = useRef(status);
  processingRef.current = status;

  useEffect(() => {
    if (status !== "processing") return;
    const id = setInterval(fetchGraph, 8000);
    return () => clearInterval(id);
  }, [status, fetchGraph]);

  const handleRefresh = useCallback(() => setRefreshTick((t) => t + 1), []);

  const handleSourceAdded = useCallback(() => {
    // Flip to processing so graph polling starts
    setStatus("processing");
  }, []);

  const handleForgetAll = useCallback(() => {
    setGraphData({ nodes: [], links: [] });
    setStatus("idle");
  }, []);

  const nodeCount = graphData.nodes.length;
  const edgeCount = graphData.links.length;

  return (
    <div className="flex flex-col h-full bg-[#070b12] text-[#e6edf3] select-none">
      {/* ---- Top bar ---- */}
      <header className="flex-none h-11 flex items-center px-4 gap-4 border-b border-[#1c2333]">
        {/* Logo */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <svg
            width="22"
            height="22"
            viewBox="0 0 22 22"
            fill="none"
            aria-hidden
          >
            <circle cx="11" cy="11" r="4" fill="#58a6ff" opacity="0.9" />
            <circle cx="3.5" cy="3.5" r="2.5" fill="#a855f7" opacity="0.85" />
            <circle cx="18.5" cy="3.5" r="2.5" fill="#22c55e" opacity="0.85" />
            <circle cx="3.5" cy="18.5" r="2.5" fill="#f97316" opacity="0.85" />
            <circle cx="18.5" cy="18.5" r="2.5" fill="#ef4444" opacity="0.85" />
            <line x1="8" y1="8" x2="5.5" y2="5.5" stroke="#58a6ff" strokeWidth="1" opacity="0.45" />
            <line x1="14" y1="8" x2="16.5" y2="5.5" stroke="#58a6ff" strokeWidth="1" opacity="0.45" />
            <line x1="8" y1="14" x2="5.5" y2="16.5" stroke="#58a6ff" strokeWidth="1" opacity="0.45" />
            <line x1="14" y1="14" x2="16.5" y2="16.5" stroke="#58a6ff" strokeWidth="1" opacity="0.45" />
          </svg>
          <span
            className="text-sm font-bold tracking-tight"
            style={{
              background: "linear-gradient(90deg, #58a6ff 0%, #a78bfa 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            InvestorBrain
          </span>
        </div>

        <span className="hidden sm:block text-[11px] text-[#6e7681] flex-shrink-0">
          your bias-aware investing memory
        </span>

        <div className="flex-1" />

        {/* Stats */}
        {nodeCount > 0 && (
          <span className="hidden sm:block text-[11px] font-mono text-[#6e7681] flex-shrink-0">
            {nodeCount} nodes · {edgeCount} edges
          </span>
        )}

        {/* Status dot */}
        <StatusDot status={status} />
      </header>

      {/* ---- Main content ---- */}
      <div className="flex flex-1 min-h-0">
        {/* Graph — left ~65% */}
        <div className="flex-[65] min-w-0 border-r border-[#1c2333]">
          <GraphCanvas
            graphData={graphData}
            isProcessing={status === "processing"}
            onRefresh={handleRefresh}
          />
        </div>

        {/* Control panel — right ~35% (min 340px) */}
        <div className="flex-[35] min-w-[320px] max-w-[420px] flex flex-col bg-[#0d1117]">
          {/* Tab strip */}
          <div className="flex-none flex border-b border-[#1c2333]">
            {(["ask", "add", "memory"] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-[11px] font-semibold uppercase tracking-wider transition-all ${
                  activeTab === tab
                    ? "text-[#58a6ff] border-b-2 border-[#58a6ff] -mb-px"
                    : "text-[#6e7681] hover:text-[#8b949e] border-b-2 border-transparent"
                }`}
              >
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {activeTab === "ask" && <AskPanel />}
            {activeTab === "add" && (
              <SourcePanel onSourceAdded={handleSourceAdded} />
            )}
            {activeTab === "memory" && (
              <MemoryPanel onForgetAll={handleForgetAll} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
