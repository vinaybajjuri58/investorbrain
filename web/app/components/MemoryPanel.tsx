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
    <div className="flex flex-col h-full overflow-y-auto p-4 space-y-4" style={{ background: "#0a0a0d" }}>

      {/* ── Improve Memory card — gradient product card ── */}
      <div
        className="rounded-[8px] p-4 space-y-3.5"
        style={{ background: "linear-gradient(160deg, #2447f0, #12279d)" }}
      >
        {/* Tag pill */}
        <div>
          <span
            className="inline-flex rounded-full px-2 py-0.5 text-[8px] font-semibold uppercase"
            style={{
              fontFamily: "var(--font-geist-mono)",
              letterSpacing: "0.1em",
              background: "#ffffff",
              color: "#000000",
            }}
          >
            MEMORY
          </span>
        </div>

        <div className="flex items-start gap-3">
          {/* Icon box */}
          <div
            className="flex-none w-9 h-9 rounded-xl flex items-center justify-center mt-0.5"
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.25)",
            }}
          >
            <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden>
              <circle cx="8.5" cy="8.5" r="6" stroke="#ffffff" strokeWidth="1.3"/>
              <path d="M5.5 8.5h6M8.5 5.5v6" stroke="#ffffff" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <p
              className="text-[13px] font-semibold leading-tight"
              style={{ color: "#ffffff", fontFamily: "var(--font-space-grotesk, var(--font-geist-sans))" }}
            >
              Improve Memory
            </p>
            <p className="text-[11px] mt-1 leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
              Merges duplicate concepts, surfaces contradictions between creators,
              and consolidates related theses into a cleaner graph.
            </p>
          </div>
        </div>

        <button
          onClick={handleImprove}
          disabled={improveStatus === "loading"}
          aria-label="Run memory improvement"
          className="w-full rounded-[6px] py-2.5 text-[12px] font-medium flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: "#ffffff",
            color: "#000000",
            border: "none",
            transition: "background 200ms cubic-bezier(0.32,0.72,0,1)",
          }}
          onMouseEnter={(e) => {
            if (!e.currentTarget.disabled) {
              e.currentTarget.style.background = "#f2f2f2";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#ffffff";
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

        {improveStatus !== "idle" && improveMsg && (
          <div
            className="rounded-[6px] px-3.5 py-2.5 text-[11px] leading-relaxed"
            style={{
              background: improveStatus === "ok" ? "rgba(255,255,255,0.12)" : "rgba(255,120,120,0.2)",
              border:     improveStatus === "ok" ? "1px solid rgba(255,255,255,0.25)" : "none",
              color:      improveStatus === "ok" ? "#ffffff" : "#ffd7d7",
            }}
          >
            {improveMsg}
          </div>
        )}
      </div>

      {/* ── Forget Everything card ── */}
      <div
        className="rounded-[8px] p-4 space-y-3.5"
        style={{ background: "#0f0a0a", border: "1px solid rgba(239,68,68,0.2)" }}
      >
        <div className="flex items-start gap-3">
          <div
            className="flex-none w-9 h-9 rounded-xl flex items-center justify-center mt-0.5"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)" }}
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
              className="text-[13px] font-semibold leading-tight"
              style={{ color: "#ffffff", fontFamily: "var(--font-space-grotesk, var(--font-geist-sans))" }}
            >
              Forget Everything
            </p>
            <p className="text-[11px] mt-1 leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
              Erase the entire knowledge graph. All nodes, edges, sources, and
              memories are permanently deleted. This cannot be undone.
            </p>
          </div>
        </div>

        {!forgetConfirm ? (
          <button
            onClick={handleForget}
            disabled={forgetStatus === "loading"}
            aria-label="Forget all memories"
            className="w-full rounded-[6px] py-2.5 text-[12px] font-medium flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: "rgba(239,68,68,0.07)",
              border: "1px solid rgba(239,68,68,0.22)",
              color: "#f87171",
              transition: "background 200ms ease",
            }}
            onMouseEnter={(e) => {
              if (!e.currentTarget.disabled)
                e.currentTarget.style.background = "rgba(239,68,68,0.14)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(239,68,68,0.07)";
            }}
          >
            {forgetStatus === "loading" ? <><SpinnerIcon /> Erasing…</> : "Forget Everything"}
          </button>
        ) : (
          <div className="space-y-2.5">
            <p className="text-[11.5px] text-[#f87171] text-center font-medium">
              This cannot be undone. Are you sure?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForgetConfirm(false)}
                aria-label="Cancel forget"
                className="flex-1 rounded-[6px] py-2.5 text-[12px] font-medium cursor-pointer active:scale-[0.98]"
                style={{
                  background: "#0f0f12",
                  border: "1px solid #1a1a1f",
                  color: "rgba(255,255,255,0.4)",
                  transition: "color 150ms ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#ffffff"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
              >
                Cancel
              </button>
              <button
                onClick={handleForget}
                aria-label="Confirm forget all"
                className="flex-1 rounded-[6px] py-2.5 text-[12px] font-medium cursor-pointer active:scale-[0.98]"
                style={{
                  background: "rgba(239,68,68,0.14)",
                  border: "1px solid rgba(239,68,68,0.35)",
                  color: "#fca5a5",
                  transition: "background 200ms ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.22)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.14)"; }}
              >
                Yes, erase all
              </button>
            </div>
          </div>
        )}

        {forgetStatus !== "idle" && forgetMsg && (
          <div
            className={`rounded-[6px] px-3.5 py-2.5 text-[11px] leading-relaxed ${
              forgetStatus === "ok" ? "text-[#22c55e]" : "text-[#f87171]"
            }`}
            style={{
              background: forgetStatus === "ok" ? "rgba(34,197,94,0.07)" : "rgba(248,113,113,0.07)",
              border:     forgetStatus === "ok" ? "1px solid rgba(34,197,94,0.18)" : "1px solid rgba(248,113,113,0.18)",
            }}
          >
            {forgetMsg}
          </div>
        )}
      </div>

      {/* ── How memory works callout ── */}
      <div
        className="rounded-[8px] px-3.5 py-3 text-[11px] leading-relaxed space-y-1"
        style={{ background: "#0f0f12", border: "1px solid #1a1a1f", color: "rgba(255,255,255,0.4)" }}
      >
        <div className="mb-1.5">
          <p
            className="uppercase"
            style={{
              fontFamily: "var(--font-geist-mono)",
              fontSize: "9px",
              letterSpacing: "0.2em",
              color: "rgba(255,255,255,0.4)",
            }}
          >
            → HOW MEMORY WORKS
          </p>
        </div>
        <p>
          Each source you add is ingested into Cognee&apos;s knowledge graph.
          Improvement runs de-duplication and contradiction detection across all
          nodes. Forgetting removes everything — re-add sources to start fresh.
        </p>
      </div>
    </div>
  );
}
