"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { signOut } from "next-auth/react";
import { fetchJson } from "@/app/hooks/useApi";
import GraphCanvas, { type GraphData } from "@/app/components/GraphCanvas";
import AskPanel from "@/app/components/AskPanel";
import SourcePanel from "@/app/components/SourcePanel";
import MemoryPanel from "@/app/components/MemoryPanel";
import StatusDot, { type ProcessingStatus } from "@/app/components/StatusDot";

// -------- session user type (matches Auth.js Session['user']) --------
type SessionUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

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
interface DashboardProps {
  user: SessionUser | null;
}

export default function Dashboard({ user }: DashboardProps) {
  const [graphData, setGraphData] = useState<GraphData>({
    nodes: [],
    links: [],
  });
  const [status, setStatus] = useState<ProcessingStatus>("idle");
  const [activeTab, setActiveTab] = useState<Tab>("ask");
  const [refreshTick, setRefreshTick] = useState(0);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [userMenuOpen]);

  const fetchGraph = useCallback(async () => {
    try {
      const data = await fetchJson<GraphData>("/api/graph");
      if (data.nodes) setGraphData(data);
    } catch {
      // ignore — Cognee may not be running yet
    }
  }, []);

  useEffect(() => {
    fetchGraph();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchGraph, refreshTick]);

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

  const processingRef = useRef(status);
  processingRef.current = status;

  useEffect(() => {
    if (status !== "processing") return;
    const id = setInterval(fetchGraph, 8000);
    return () => clearInterval(id);
  }, [status, fetchGraph]);

  const handleRefresh = useCallback(() => setRefreshTick((t) => t + 1), []);

  const handleSourceAdded = useCallback(() => {
    setStatus("processing");
  }, []);

  const handleForgetAll = useCallback(() => {
    setGraphData({ nodes: [], links: [] });
    setStatus("idle");
  }, []);

  const nodeCount = graphData.nodes.length;
  const edgeCount = graphData.links.length;

  // User avatar: image from Google, or initial letter fallback
  const userInitial = (
    (user?.name ?? user?.email ?? "U")[0] ?? "U"
  ).toUpperCase();

  return (
    <div className="flex flex-col h-full bg-[#080c14] text-[#e4edf8] select-none">

      {/* ── Top bar ── */}
      <header className="flex-none h-12 flex items-center px-4 gap-3 border-b border-[#1c2a3f] bg-[#0d1320]">

        {/* Logo mark + brand name */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {/* Knowledge-graph icon: amber centre + colour-coded satellite nodes */}
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            {/* Edges */}
            <line x1="10" y1="10" x2="4"  y2="4"  stroke="#f59e0b" strokeWidth="0.9" strokeOpacity="0.5"/>
            <line x1="10" y1="10" x2="16" y2="4"  stroke="#f59e0b" strokeWidth="0.9" strokeOpacity="0.5"/>
            <line x1="10" y1="10" x2="4"  y2="16" stroke="#f59e0b" strokeWidth="0.9" strokeOpacity="0.5"/>
            <line x1="10" y1="10" x2="16" y2="16" stroke="#f59e0b" strokeWidth="0.9" strokeOpacity="0.5"/>
            {/* Satellite nodes — match graph type colours */}
            <circle cx="4"  cy="4"  r="2"   fill="#22c55e"/>
            <circle cx="16" cy="4"  r="2"   fill="#4f9cf9"/>
            <circle cx="4"  cy="16" r="2"   fill="#ef4444"/>
            <circle cx="16" cy="16" r="2"   fill="#a78bfa"/>
            {/* Centre node — amber brand accent */}
            <circle cx="10" cy="10" r="3.5" fill="#f59e0b"/>
            {/* Specular highlight */}
            <circle cx="8.7" cy="8.7" r="1.1" fill="rgba(255,255,255,0.26)"/>
          </svg>

          <span
            className="text-[13.5px] font-semibold tracking-[-0.01em] text-[#e4edf8]"
            style={{ fontFamily: "var(--font-space-grotesk, var(--font-geist-sans))" }}
          >
            InvestorBrain
          </span>
        </div>

        {/* Vertical rule */}
        <div className="hidden sm:block w-px h-4 bg-[#1c2a3f] flex-shrink-0" />

        {/* Tagline */}
        <span className="hidden sm:block text-[10.5px] text-[#4a5c6e] flex-shrink-0 font-mono tracking-wide">
          bias-aware investing memory
        </span>

        <div className="flex-1" />

        {/* Graph stats */}
        {nodeCount > 0 && (
          <span className="hidden sm:block text-[11px] font-mono text-[#4a5c6e] flex-shrink-0 tabular-nums">
            {nodeCount}&thinsp;nodes · {edgeCount}&thinsp;edges
          </span>
        )}

        {/* Status indicator */}
        <StatusDot status={status} />

        {/* User menu */}
        {user && (
          <div className="relative flex-shrink-0 ml-1" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              aria-label="User menu"
              aria-expanded={userMenuOpen}
              className="flex items-center justify-center w-7 h-7 rounded-full overflow-hidden focus-visible:outline-2 focus-visible:outline-[#f59e0b] focus-visible:outline-offset-2 cursor-pointer"
            >
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.image}
                  alt={user.name ?? "User avatar"}
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 rounded-full object-cover border border-[#253548]"
                />
              ) : (
                <span className="w-7 h-7 rounded-full bg-[#f59e0b] flex items-center justify-center text-[#080c14] text-[11px] font-bold border border-[#253548]">
                  {userInitial}
                </span>
              )}
            </button>

            {/* Dropdown */}
            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-[#111928] border border-[#1c2a3f] rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="px-3 py-2.5 border-b border-[#1c2a3f]">
                  {user.name && (
                    <p className="text-[12px] font-medium text-[#e4edf8] truncate">
                      {user.name}
                    </p>
                  )}
                  <p className="text-[11px] text-[#4a5c6e] truncate mt-0.5">
                    {user.email}
                  </p>
                </div>
                <button
                  onClick={() => signOut({ redirectTo: "/signin" })}
                  className="w-full text-left px-3 py-2.5 text-[12px] text-[#7b97b5] hover:text-[#e4edf8] hover:bg-[#162035] transition-colors duration-100 cursor-pointer"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* ── Main layout ── */}
      <div className="flex flex-1 min-h-0">

        {/* Graph canvas — left ~65% */}
        <div className="flex-[65] min-w-0 border-r border-[#1c2a3f]">
          <GraphCanvas
            graphData={graphData}
            isProcessing={status === "processing"}
            onRefresh={handleRefresh}
          />
        </div>

        {/* Control panel — right ~35% */}
        <div className="flex-[35] min-w-[320px] max-w-[420px] flex flex-col bg-[#0d1320]">

          {/* Tab strip */}
          <div className="flex-none flex border-b border-[#1c2a3f]">
            {(["ask", "add", "memory"] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{ fontFamily: "var(--font-space-grotesk, var(--font-geist-sans))" }}
                className={[
                  "flex-1 py-3 text-[11.5px] font-medium tracking-wide transition-all duration-150 cursor-pointer",
                  activeTab === tab
                    ? "text-[#f59e0b] border-b-2 border-[#f59e0b] -mb-px"
                    : "text-[#4a5c6e] hover:text-[#7b97b5] border-b-2 border-transparent",
                ].join(" ")}
              >
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {activeTab === "ask"    && <AskPanel />}
            {activeTab === "add"    && <SourcePanel onSourceAdded={handleSourceAdded} />}
            {activeTab === "memory" && <MemoryPanel onForgetAll={handleForgetAll} />}
          </div>
        </div>
      </div>
    </div>
  );
}
