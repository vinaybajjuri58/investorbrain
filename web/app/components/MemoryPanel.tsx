"use client";

import { useState, useCallback } from "react";
import { fetchJson } from "@/app/hooks/useApi";

interface ImproveResponse {
  ok: boolean;
  status?: string;
  error?: string;
}

interface ForgetResponse {
  ok: boolean;
  error?: string;
}

interface Props {
  onForgetAll: () => void;
}

type ActionStatus = "idle" | "loading" | "ok" | "error";

function SpinnerIcon() {
  return (
    <svg className="animate-spin" width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
      <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="20 10"/>
    </svg>
  );
}

export default function MemoryPanel({ onForgetAll }: Props) {
  const [improveStatus, setImproveStatus] = useState<ActionStatus>("idle");
  const [improveMsg,    setImproveMsg]    = useState("");

  const [forgetStatus,  setForgetStatus]  = useState<ActionStatus>("idle");
  const [forgetMsg,     setForgetMsg]     = useState("");
  const [forgetConfirm, setForgetConfirm] = useState(false);

  const handleImprove = useCallback(async () => {
    setImproveStatus("loading");
    setImproveMsg("");
    try {
      const data = await fetchJson<ImproveResponse>("/api/improve", {
        method: "POST",
        body: "{}",
      });
      if (data.ok) {
        setImproveStatus("ok");
        setImproveMsg(data.status ?? "Memory improvement queued.");
      } else {
        setImproveStatus("error");
        setImproveMsg(data.error ?? "Something went wrong.");
      }
    } catch (err) {
      setImproveStatus("error");
      setImproveMsg(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const handleForget = useCallback(async () => {
    if (!forgetConfirm) {
      setForgetConfirm(true);
      return;
    }
    setForgetStatus("loading");
    setForgetMsg("");
    setForgetConfirm(false);
    try {
      const data = await fetchJson<ForgetResponse>("/api/forget", {
        method: "POST",
        body: JSON.stringify({ all: true }),
      });
      if (data.ok) {
        setForgetStatus("ok");
        setForgetMsg("Graph erased. All memories cleared.");
        onForgetAll();
      } else {
        setForgetStatus("error");
        setForgetMsg(data.error ?? "Something went wrong.");
      }
    } catch (err) {
      setForgetStatus("error");
      setForgetMsg(err instanceof Error ? err.message : String(err));
    }
  }, [forgetConfirm, onForgetAll]);

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 space-y-4 bg-[#0d1320]">

      {/* ── Improve Memory card — double-bezel ── */}
      <div
        className="rounded-2xl p-[5px]"
        style={{ background: "#080c14", border: "1px solid #1c2a3f" }}
      >
        {/* Inner core */}
        <div
          className="rounded-[11px] p-4 space-y-3.5"
          style={{
            background:  "#111928",
            boxShadow:   "inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          {/* Header */}
          <div className="flex items-start gap-3">
            {/* Icon container */}
            <div
              className="flex-none w-9 h-9 rounded-lg flex items-center justify-center mt-0.5"
              style={{ background: "#162035", border: "1px solid #253548" }}
            >
              <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden>
                <circle cx="8.5" cy="8.5" r="6.5" stroke="#7b97b5" strokeWidth="1.3"/>
                <path d="M5.5 8.5h6M8.5 5.5v6" stroke="#7b97b5" strokeWidth="1.3" strokeLinecap="round"/>
                {/* Accent ring — amber */}
                <circle cx="13" cy="4" r="2.5" fill="#111928" stroke="#f59e0b" strokeWidth="1.1"/>
                <path d="M12.3 4h1.4M13 3.3v1.4" stroke="#f59e0b" strokeWidth="0.8" strokeLinecap="round"/>
              </svg>
            </div>

            <div className="flex-1 min-w-0">
              <p
                className="text-[13px] font-semibold text-[#e4edf8] leading-tight"
                style={{ fontFamily: "var(--font-space-grotesk, var(--font-geist-sans))" }}
              >
                Improve Memory
              </p>
              <p className="text-[11px] text-[#7b97b5] mt-1 leading-relaxed">
                Merges duplicate concepts, surfaces contradictions between creators,
                and consolidates related theses into a cleaner graph.
              </p>
            </div>
          </div>

          {/* Action button */}
          <button
            onClick={handleImprove}
            disabled={improveStatus === "loading"}
            aria-label="Run memory improvement"
            className="w-full rounded-lg py-2.5 text-[12px] font-medium transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: "#162035",
              border:     "1px solid #253548",
              color:      "#7b97b5",
            }}
            onMouseEnter={(e) => {
              if (!e.currentTarget.disabled) {
                e.currentTarget.style.background = "#1c2a3f";
                e.currentTarget.style.color      = "#e4edf8";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#162035";
              e.currentTarget.style.color      = "#7b97b5";
            }}
          >
            {improveStatus === "loading" ? (
              <><SpinnerIcon /> Improving…</>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
                  <path d="M9.5 6.5A4 4 0 1 1 5.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  <path d="M5.5 2.5L8 5M5.5 2.5l2.5-2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Run Improvement
              </>
            )}
          </button>

          {/* Improve result */}
          {improveStatus !== "idle" && improveMsg && (
            <div
              className={`rounded-lg px-3 py-2.5 text-[11px] leading-relaxed ${
                improveStatus === "ok" ? "text-[#22c55e]" : "text-[#f87171]"
              }`}
              style={{
                background: improveStatus === "ok" ? "rgba(34,197,94,0.08)"  : "rgba(248,113,113,0.08)",
                border:     improveStatus === "ok" ? "1px solid rgba(34,197,94,0.2)" : "1px solid rgba(248,113,113,0.2)",
              }}
            >
              {improveMsg}
            </div>
          )}
        </div>
      </div>

      {/* ── Forget Everything card — double-bezel, danger ── */}
      <div
        className="rounded-2xl p-[5px]"
        style={{ background: "#080c14", border: "1px solid rgba(239,68,68,0.18)" }}
      >
        <div
          className="rounded-[11px] p-4 space-y-3.5"
          style={{
            background:  "#120d0d",
            boxShadow:   "inset 0 1px 0 rgba(239,68,68,0.04)",
          }}
        >
          {/* Header */}
          <div className="flex items-start gap-3">
            <div
              className="flex-none w-9 h-9 rounded-lg flex items-center justify-center mt-0.5"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden>
                <rect x="2.5" y="5" width="12" height="9.5" rx="1.5" stroke="#ef4444" strokeWidth="1.2"/>
                <path d="M5.5 5V4a3 3 0 0 1 6 0v1" stroke="#ef4444" strokeWidth="1.2" strokeLinecap="round"/>
                <path d="M6.5 8.5v3.5M10.5 8.5v3.5" stroke="#ef4444" strokeWidth="1.2" strokeLinecap="round"/>
                <line x1="1.5" y1="5" x2="15.5" y2="5" stroke="#ef4444" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-[13px] font-semibold text-[#e4edf8] leading-tight"
                style={{ fontFamily: "var(--font-space-grotesk, var(--font-geist-sans))" }}
              >
                Forget Everything
              </p>
              <p className="text-[11px] text-[#7b97b5] mt-1 leading-relaxed">
                Erase the entire knowledge graph. All nodes, edges, sources, and
                memories are permanently deleted. This cannot be undone.
              </p>
            </div>
          </div>

          {/* Forget / confirm flow */}
          {!forgetConfirm ? (
            <button
              onClick={handleForget}
              disabled={forgetStatus === "loading"}
              aria-label="Forget all memories"
              className="w-full rounded-lg py-2.5 text-[12px] font-medium transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: "rgba(239,68,68,0.08)",
                border:     "1px solid rgba(239,68,68,0.25)",
                color:      "#f87171",
              }}
              onMouseEnter={(e) => {
                if (!e.currentTarget.disabled)
                  e.currentTarget.style.background = "rgba(239,68,68,0.14)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(239,68,68,0.08)";
              }}
            >
              {forgetStatus === "loading" ? (
                <><SpinnerIcon /> Erasing…</>
              ) : (
                "Forget Everything"
              )}
            </button>
          ) : (
            <div className="space-y-2.5">
              <p className="text-[11.5px] text-[#f87171] text-center font-medium">
                This cannot be undone. Are you sure?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setForgetConfirm(false)}
                  aria-label="Cancel forget"
                  className="flex-1 rounded-lg py-2.5 text-[12px] font-medium transition-all duration-150 cursor-pointer active:scale-[0.98]"
                  style={{
                    background: "#111928",
                    border:     "1px solid #253548",
                    color:      "#7b97b5",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#e4edf8";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "#7b97b5";
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleForget}
                  aria-label="Confirm forget all"
                  className="flex-1 rounded-lg py-2.5 text-[12px] font-medium transition-all duration-150 cursor-pointer active:scale-[0.98]"
                  style={{
                    background: "rgba(239,68,68,0.15)",
                    border:     "1px solid rgba(239,68,68,0.4)",
                    color:      "#fca5a5",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(239,68,68,0.24)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(239,68,68,0.15)";
                  }}
                >
                  Yes, erase all
                </button>
              </div>
            </div>
          )}

          {/* Forget result */}
          {forgetStatus !== "idle" && forgetMsg && (
            <div
              className={`rounded-lg px-3 py-2.5 text-[11px] leading-relaxed ${
                forgetStatus === "ok" ? "text-[#22c55e]" : "text-[#f87171]"
              }`}
              style={{
                background: forgetStatus === "ok" ? "rgba(34,197,94,0.08)"  : "rgba(248,113,113,0.08)",
                border:     forgetStatus === "ok" ? "1px solid rgba(34,197,94,0.2)" : "1px solid rgba(248,113,113,0.2)",
              }}
            >
              {forgetMsg}
            </div>
          )}
        </div>
      </div>

      {/* ── How memory works callout ── */}
      <div
        className="rounded-xl px-3.5 py-3 text-[11px] text-[#4a5c6e] leading-relaxed space-y-1"
        style={{ background: "#111928", border: "1px solid #1c2a3f" }}
      >
        <p
          className="font-medium text-[#7b97b5] text-[11.5px]"
          style={{ fontFamily: "var(--font-space-grotesk, var(--font-geist-sans))" }}
        >
          How memory works
        </p>
        <p>
          Each source you add is ingested into Cognee&apos;s knowledge graph.
          Improvement runs de-duplication and contradiction detection across all
          nodes. Forgetting removes everything — re-add sources to start fresh.
        </p>
      </div>
    </div>
  );
}
