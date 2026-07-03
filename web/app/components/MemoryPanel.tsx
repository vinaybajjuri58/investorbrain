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

export default function MemoryPanel({ onForgetAll }: Props) {
  const [improveStatus, setImproveStatus] = useState<ActionStatus>("idle");
  const [improveMsg, setImproveMsg] = useState("");

  const [forgetStatus, setForgetStatus] = useState<ActionStatus>("idle");
  const [forgetMsg, setForgetMsg] = useState("");
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
    <div className="flex flex-col h-full overflow-y-auto p-4 space-y-4">
      {/* Improve Memory card */}
      <div className="rounded-xl border border-[#1d3352] bg-[#0d1f35] p-4 space-y-3">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-none w-9 h-9 rounded-lg bg-[#132240] flex items-center justify-center mt-0.5">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="7" stroke="#58a6ff" strokeWidth="1.4" />
              <path d="M6 9h6M9 6v6" stroke="#58a6ff" strokeWidth="1.4" strokeLinecap="round" />
              <circle cx="14" cy="4" r="2.5" fill="#0d1f35" stroke="#f97316" strokeWidth="1.2" />
              <path d="M13 4h2M14 3v2" stroke="#f97316" strokeWidth="0.9" strokeLinecap="round" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#e6edf3]">Improve Memory</p>
            <p className="text-[11px] text-[#8b949e] mt-0.5 leading-relaxed">
              Merges duplicate concepts, surfaces contradictions between creators,
              and consolidates related theses into a cleaner graph.
            </p>
          </div>
        </div>

        <button
          onClick={handleImprove}
          disabled={improveStatus === "loading"}
          className="w-full bg-[#1f3352] hover:bg-[#253f66] border border-[#2d4a73] disabled:opacity-40 disabled:cursor-not-allowed text-[#58a6ff] rounded-lg py-2 text-xs font-medium transition-colors flex items-center justify-center gap-2"
        >
          {improveStatus === "loading" ? (
            <>
              <svg className="animate-spin" width="13" height="13" viewBox="0 0 13 13" fill="none">
                <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="20 10" />
              </svg>
              Improving…
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M9.5 6.5A4 4 0 1 1 5.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                <path d="M5.5 2.5L8 5M5.5 2.5l2.5-2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Run Improvement
            </>
          )}
        </button>

        {improveStatus !== "idle" && improveMsg && (
          <div
            className={`rounded-lg px-3 py-2 text-[11px] leading-relaxed ${
              improveStatus === "ok"
                ? "bg-[#0d2218] border border-[#1a4731] text-[#3fb950]"
                : "bg-[#2d1519] border border-[#6e1a1a] text-red-400"
            }`}
          >
            {improveMsg}
          </div>
        )}
      </div>

      {/* Forget Everything card */}
      <div className="rounded-xl border border-[#3d1a1a] bg-[#1a0d0d] p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex-none w-9 h-9 rounded-lg bg-[#2d1519] flex items-center justify-center mt-0.5">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="3" y="5" width="12" height="10" rx="1.5" stroke="#ef4444" strokeWidth="1.3" />
              <path d="M6 5V4a2 2 0 0 1 6 0v1" stroke="#ef4444" strokeWidth="1.3" strokeLinecap="round" />
              <path d="M7.5 8.5v4M10.5 8.5v4" stroke="#ef4444" strokeWidth="1.3" strokeLinecap="round" />
              <line x1="2" y1="5" x2="16" y2="5" stroke="#ef4444" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#e6edf3]">Forget Everything</p>
            <p className="text-[11px] text-[#8b949e] mt-0.5 leading-relaxed">
              Erase the entire knowledge graph. All nodes, edges, sources, and memories
              are permanently deleted. This cannot be undone.
            </p>
          </div>
        </div>

        {!forgetConfirm ? (
          <button
            onClick={handleForget}
            disabled={forgetStatus === "loading"}
            className="w-full bg-[#2d1519] hover:bg-[#3d1f25] border border-[#6e1a1a] disabled:opacity-40 disabled:cursor-not-allowed text-red-400 rounded-lg py-2 text-xs font-medium transition-colors flex items-center justify-center gap-2"
          >
            {forgetStatus === "loading" ? (
              <>
                <svg className="animate-spin" width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="20 10" />
                </svg>
                Erasing…
              </>
            ) : (
              "Forget Everything"
            )}
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-red-400 text-center font-medium">
              Are you sure? This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setForgetConfirm(false)}
                className="flex-1 bg-[#161b22] border border-[#30363d] text-[#8b949e] hover:text-[#e6edf3] rounded-lg py-2 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleForget}
                className="flex-1 bg-red-900 hover:bg-red-800 border border-red-700 text-red-300 rounded-lg py-2 text-xs font-medium transition-colors"
              >
                Yes, erase all
              </button>
            </div>
          </div>
        )}

        {forgetStatus !== "idle" && forgetMsg && (
          <div
            className={`rounded-lg px-3 py-2 text-[11px] leading-relaxed ${
              forgetStatus === "ok"
                ? "bg-[#0d2218] border border-[#1a4731] text-[#3fb950]"
                : "bg-[#2d1519] border border-[#6e1a1a] text-red-400"
            }`}
          >
            {forgetMsg}
          </div>
        )}
      </div>

      {/* Info callout */}
      <div className="rounded-lg border border-[#21262d] bg-[#0d1117] px-3 py-2.5 text-[11px] text-[#6e7681] leading-relaxed space-y-1">
        <p className="font-semibold text-[#8b949e]">How memory works</p>
        <p>
          Each source you add is ingested into Cognee&apos;s knowledge graph.
          Improvement runs de-duplication and contradiction detection across all
          nodes. Forgetting removes everything — re-add sources to start fresh.
        </p>
      </div>
    </div>
  );
}
