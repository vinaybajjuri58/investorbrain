"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { signOut } from "next-auth/react";
import { fetchJson } from "@/app/hooks/useApi";
import GraphCanvas from "@/app/components/GraphCanvas";
import { type GraphData } from "@/app/components/graphTypes";
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
  add: "Add",
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
  const [graphLoading, setGraphLoading] = useState(true);
  const firstFetchDoneRef = useRef(false);
  const [status, setStatus] = useState<ProcessingStatus>("idle");
  const [activeTab, setActiveTab] = useState<Tab>("ask");
  const [refreshTick, setRefreshTick] = useState(0);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Until this timestamp, status polls that report non-processing are ignored:
  // right after a source is added, Cognee's background run hasn't registered
  // yet, so the poll would report the PREVIOUS run's state and hide the loader.
  const optimisticProcessingUntilRef = useRef(0);

  const showToast = useCallback((message: string, ms = 8000) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = setTimeout(() => setToast(null), ms);
  }, []);

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

  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  });

  const fetchGraph = useCallback(async () => {
    try {
      const data = await fetchJson<GraphData>("/api/graph");
      if (data.nodes) {
        // During processing, Cognee may report an empty graph mid-pipeline
        // (old nodes evicted, new ones not yet extracted). Keep the previous
        // data so the canvas never shows the empty state while processing.
        if (data.nodes.length > 0 || statusRef.current !== "processing") {
          setGraphData(data);
        }
      }
    } catch {
      // ignore — Cognee may not be running yet
    } finally {
      if (!firstFetchDoneRef.current) {
        firstFetchDoneRef.current = true;
        setGraphLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchGraph();
  }, [fetchGraph, refreshTick]);

  useEffect(() => {
    let cancelled = false;
    async function pollStatus() {
      try {
        const data = await fetchJson<unknown>("/api/status");
        if (!cancelled) {
          const parsed = parseStatus(data);
          if (
            parsed !== "processing" &&
            Date.now() < optimisticProcessingUntilRef.current
          ) {
            return; // hold the optimistic "processing" state
          }
          setStatus(parsed);
        }
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

  useEffect(() => {
    if (status !== "processing") return;
    const id = setInterval(fetchGraph, 8000);
    return () => clearInterval(id);
  }, [status, fetchGraph]);

  // Refresh once when processing completes, so nodes extracted after the
  // last 8s poll tick still appear without a manual refresh.
  const prevStatusRef = useRef(status);
  useEffect(() => {
    if (prevStatusRef.current === "processing" && status !== "processing") {
      fetchGraph();
      showToast("Memory graph updated", 4000);
    }
    prevStatusRef.current = status;
  }, [status, fetchGraph, showToast]);

  const handleRefresh = useCallback(() => setRefreshTick((t) => t + 1), []);

  const handleSourceAdded = useCallback(() => {
    optimisticProcessingUntilRef.current = Date.now() + 20000;
    setStatus("processing");
    showToast("Building your memory graph — new nodes appear automatically in ~10–15 s");
  }, [showToast]);

  const handleForgetAll = useCallback(() => {
    optimisticProcessingUntilRef.current = 0;
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
      className="flex flex-col h-full text-white select-none relative z-[1]"
      style={{ background: "#050505", borderTop: "3px solid #1d3be0" }}
    >

      {/* ── Top bar ── */}
      <header
        className="flex-none h-14 flex items-center px-5 gap-4"
        style={{
          background: "rgba(5,5,5,0.92)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >

        {/* Logo mark + brand name */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Knowledge-graph icon with subtle glow */}
          <div style={{ filter: "drop-shadow(0 0 6px rgba(29,59,224,0.5))" }}>
            <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden>
              <line x1="10" y1="10" x2="4"  y2="4"  stroke="white" strokeWidth="1" strokeOpacity="0.55"/>
              <line x1="10" y1="10" x2="16" y2="4"  stroke="white" strokeWidth="1" strokeOpacity="0.55"/>
              <line x1="10" y1="10" x2="4"  y2="16" stroke="white" strokeWidth="1" strokeOpacity="0.55"/>
              <line x1="10" y1="10" x2="16" y2="16" stroke="white" strokeWidth="1" strokeOpacity="0.55"/>
              <circle cx="4"  cy="4"  r="2"   fill="#22c55e"/>
              <circle cx="16" cy="4"  r="2"   fill="#4f9cf9"/>
              <circle cx="4"  cy="16" r="2"   fill="#ef4444"/>
              <circle cx="16" cy="16" r="2"   fill="#a78bfa"/>
              <circle cx="10" cy="10" r="3.5" fill="white"/>
              <circle cx="8.7" cy="8.7" r="1.1" fill="rgba(255,255,255,0.3)"/>
            </svg>
          </div>

          <div className="flex flex-col leading-none gap-0.5">
            <span
              className="text-[13px] font-semibold tracking-[0.01em] text-white"
              style={{ fontFamily: "var(--font-space-grotesk, var(--font-geist-sans))" }}
            >
              InvestorBrain
            </span>
            <span
              className="hidden sm:block text-[9.5px] font-mono tracking-[0.1em] uppercase"
              style={{ color: "rgba(255,255,255,0.25)" }}
            >
              bias-aware memory
            </span>
          </div>
        </div>

        {/* Vertical rule */}
        <div
          className="hidden sm:block w-px h-5 flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.08)" }}
        />

        <div className="flex-1" />

        {/* Graph stats */}
        {nodeCount > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
            <span
              className="text-[9px] font-mono tracking-[0.12em] uppercase"
              style={{ color: "rgba(255,255,255,0.25)" }}
            >
              graph
            </span>
            <span
              className="text-[11px] font-mono tabular-nums"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
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
              type="button"
              onClick={() => setUserMenuOpen((v) => !v)}
              aria-label="User menu"
              aria-expanded={userMenuOpen}
              className="flex items-center justify-center w-7 h-7 rounded-full overflow-hidden cursor-pointer"
              style={{ transition: "box-shadow 200ms cubic-bezier(0.32,0.72,0,1)" }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 0 0 2px rgba(29,59,224,0.5)")}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
            >
              {user.image ? (
                <Image
                  src={user.image}
                  alt={user.name ?? "User avatar"}
                  referrerPolicy="no-referrer"
                  width={28}
                  height={28}
                  className="rounded-full object-cover"
                  style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                />
              ) : (
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
                  style={{ background: "#1d3be0", color: "#ffffff", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  {userInitial}
                </span>
              )}
            </button>

            {/* Dropdown */}
            {userMenuOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-52 rounded-xl shadow-2xl z-50 overflow-hidden"
                style={{ background: "#0a0a0d", border: "1px solid rgba(255,255,255,0.10)" }}
              >
                <div className="px-3.5 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
                  {user.name && (
                    <p className="text-[12px] font-medium text-white truncate">
                      {user.name}
                    </p>
                  )}
                  <p
                    className="text-[10.5px] truncate mt-0.5 font-mono"
                    style={{ color: "rgba(255,255,255,0.30)" }}
                  >
                    {user.email}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => signOut({ redirectTo: "/signin" })}
                  className="w-full text-left px-3.5 py-2.5 text-[12px] cursor-pointer"
                  style={{
                    color: "rgba(255,255,255,0.50)",
                    transition: "color 150ms cubic-bezier(0.32,0.72,0,1), background 150ms cubic-bezier(0.32,0.72,0,1)",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#ffffff"; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.50)"; e.currentTarget.style.background = "transparent"; }}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* ── Main layout ── */}
      <div className="flex flex-col md:flex-row flex-1 min-h-0">

        {/* Graph canvas — top on mobile, left ~65% on desktop */}
        <div className="flex-[65] min-h-[55vh] md:min-h-0 min-w-0 border-b border-white/[0.08] md:border-b-0 md:border-r md:border-white/[0.08]">
          <GraphCanvas
            graphData={graphData}
            isProcessing={status === "processing"}
            graphLoading={graphLoading}
            onRefresh={handleRefresh}
          />
        </div>

        {/* Control panel — bottom on mobile, right ~35% on desktop */}
        <div
          className="flex-[35] md:max-w-[420px] flex flex-col"
          style={{ background: "#0a0a0d" }}
        >

          {/* Tab strip — landing pill style */}
          <div
            className="flex-none flex items-center px-3 py-2.5"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div
              className="flex flex-1 rounded-full gap-0.5"
              style={{ background: "rgba(255,255,255,0.06)", padding: "5px" }}
            >
              {(["ask", "add", "memory"] as Tab[]).map((tab) => (
                <button
                  type="button"
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    fontFamily: "var(--font-geist-sans)",
                    transition: "background 200ms cubic-bezier(0.32,0.72,0,1), color 200ms cubic-bezier(0.32,0.72,0,1)",
                    background: activeTab === tab ? "#1d3be0" : "transparent",
                    color: activeTab === tab ? "#ffffff" : "rgba(255,255,255,0.4)",
                  }}
                  className="flex-1 py-[7px] text-[12px] font-medium rounded-full cursor-pointer"
                  onMouseEnter={(e) => {
                    if (activeTab !== tab) e.currentTarget.style.color = "rgba(255,255,255,0.70)";
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== tab) e.currentTarget.style.color = "rgba(255,255,255,0.4)";
                  }}
                >
                  {TAB_LABELS[tab]}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {activeTab === "ask"    && <AskPanel />}
            {activeTab === "add"    && <SourcePanel onSourceAdded={handleSourceAdded} />}
            {activeTab === "memory" && <MemoryPanel onForgetAll={handleForgetAll} />}
          </div>
        </div>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div
          className="absolute bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 rounded-xl px-4 py-2.5"
          style={{
            background: "rgba(15,15,18,0.95)",
            border: "1px solid rgba(29,59,224,0.4)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5), 0 0 12px rgba(29,59,224,0.15)",
            backdropFilter: "blur(8px)",
          }}
          role="status"
        >
          <div className="relative w-2 h-2 flex-shrink-0">
            <div className="w-2 h-2 rounded-full" style={{ background: "#1d3be0" }} />
            <div
              className="absolute inset-0 rounded-full status-ring"
              style={{ background: "#1d3be0" }}
            />
          </div>
          <span
            className="text-[12px]"
            style={{
              fontFamily: "var(--font-geist-sans)",
              color: "rgba(255,255,255,0.85)",
            }}
          >
            {toast}
          </span>
        </div>
      )}
    </div>
  );
}
