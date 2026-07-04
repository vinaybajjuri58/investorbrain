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
    <div
      className="flex flex-col h-full text-[#d8e3f2] select-none relative z-[1]"
      style={{ background: "#030508", borderTop: "3px solid #2563eb" }}
    >

      {/* ── Top bar ── */}
      <header className="flex-none h-14 flex items-center px-5 gap-4 border-b border-[#112238]"
        style={{ background: "rgba(7,12,20,0.96)", backdropFilter: "blur(8px)" }}
      >

        {/* Logo mark + brand name */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Knowledge-graph icon with subtle glow */}
          <div style={{ filter: "drop-shadow(0 0 6px rgba(37,99,235,0.5))" }}>
            <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden>
              <line x1="10" y1="10" x2="4"  y2="4"  stroke="#3b82f6" strokeWidth="1" strokeOpacity="0.6"/>
              <line x1="10" y1="10" x2="16" y2="4"  stroke="#3b82f6" strokeWidth="1" strokeOpacity="0.6"/>
              <line x1="10" y1="10" x2="4"  y2="16" stroke="#3b82f6" strokeWidth="1" strokeOpacity="0.6"/>
              <line x1="10" y1="10" x2="16" y2="16" stroke="#3b82f6" strokeWidth="1" strokeOpacity="0.6"/>
              <circle cx="4"  cy="4"  r="2"   fill="#22c55e"/>
              <circle cx="16" cy="4"  r="2"   fill="#4f9cf9"/>
              <circle cx="4"  cy="16" r="2"   fill="#ef4444"/>
              <circle cx="16" cy="16" r="2"   fill="#a78bfa"/>
              <circle cx="10" cy="10" r="3.5" fill="#2563eb"/>
              <circle cx="8.7" cy="8.7" r="1.1" fill="rgba(255,255,255,0.3)"/>
            </svg>
          </div>

          <div className="flex flex-col leading-none gap-0.5">
            <span
              className="text-[13px] font-semibold tracking-[0.01em] text-[#d8e3f2]"
              style={{ fontFamily: "var(--font-space-grotesk, var(--font-geist-sans))" }}
            >
              InvestorBrain
            </span>
            <span className="hidden sm:block text-[9.5px] text-[#2d4460] font-mono tracking-[0.1em] uppercase">
              bias-aware memory
            </span>
          </div>
        </div>

        {/* Vertical rule */}
        <div className="hidden sm:block w-px h-5 bg-[#112238] flex-shrink-0" />

        <div className="flex-1" />

        {/* Graph stats */}
        {nodeCount > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
            <span
              className="text-[9px] font-mono text-[#2d4460] tracking-[0.12em] uppercase"
            >
              graph
            </span>
            <span className="text-[11px] font-mono text-[#56738e] tabular-nums">
              {nodeCount}&thinsp;n · {edgeCount}&thinsp;e
            </span>
          </div>
        )}

        {/* Status indicator */}
        <StatusDot status={status} />

        {/* User menu */}
        {user && (
          <div className="relative flex-shrink-0 ml-0.5" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              aria-label="User menu"
              aria-expanded={userMenuOpen}
              className="flex items-center justify-center w-7 h-7 rounded-full overflow-hidden cursor-pointer"
              style={{ transition: "box-shadow 200ms ease" }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 0 0 2px #2563eb66")}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
            >
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.image}
                  alt={user.name ?? "User avatar"}
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 rounded-full object-cover"
                  style={{ border: "1px solid #1a3050" }}
                />
              ) : (
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
                  style={{ background: "#2563eb", color: "#030508", border: "1px solid #1a3050" }}
                >
                  {userInitial}
                </span>
              )}
            </button>

            {/* Dropdown */}
            {userMenuOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-52 rounded-xl shadow-2xl z-50 overflow-hidden"
                style={{ background: "#0b1120", border: "1px solid #112238" }}
              >
                <div className="px-3.5 py-3" style={{ borderBottom: "1px solid #112238" }}>
                  {user.name && (
                    <p className="text-[12px] font-medium text-[#d8e3f2] truncate">
                      {user.name}
                    </p>
                  )}
                  <p className="text-[10.5px] text-[#2d4460] truncate mt-0.5 font-mono">
                    {user.email}
                  </p>
                </div>
                <button
                  onClick={() => signOut({ redirectTo: "/signin" })}
                  className="w-full text-left px-3.5 py-2.5 text-[12px] text-[#56738e] hover:text-[#d8e3f2] cursor-pointer"
                  style={{ transition: "color 150ms ease, background 150ms ease" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#0f1c2e")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
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
        <div className="flex-[65] min-w-0" style={{ borderRight: "1px solid #112238" }}>
          <GraphCanvas
            graphData={graphData}
            isProcessing={status === "processing"}
            onRefresh={handleRefresh}
          />
        </div>

        {/* Control panel — right ~35% */}
        <div
          className="flex-[35] min-w-[320px] max-w-[420px] flex flex-col"
          style={{ background: "#070c14" }}
        >

          {/* Tab strip */}
          <div className="flex-none flex" style={{ borderBottom: "1px solid #112238" }}>
            {(["ask", "add", "memory"] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  fontFamily: "var(--font-space-grotesk, var(--font-geist-sans))",
                  transition: "all 200ms cubic-bezier(0.32,0.72,0,1)",
                  background: activeTab === tab ? "rgba(37,99,235,0.1)" : "transparent",
                  borderBottom: activeTab === tab ? "2px solid #2563eb" : "2px solid transparent",
                  marginBottom: "-1px",
                  color: activeTab === tab ? "#d8e3f2" : "#2d4460",
                }}
                className="flex-1 py-3.5 text-[10.5px] font-semibold tracking-[0.1em] uppercase cursor-pointer"
                onMouseEnter={(e) => {
                  if (activeTab !== tab) e.currentTarget.style.color = "#56738e";
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab) e.currentTarget.style.color = "#2d4460";
                }}
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
