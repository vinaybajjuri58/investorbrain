"use client";

import { useState, useCallback, useRef } from "react";
import { fetchJson } from "@/app/hooks/useApi";

// ── Helpers ──
function isYouTube(url: string): boolean {
  return /youtube\.com|youtu\.be/.test(url);
}

interface SourceResponse {
  ok: boolean;
  title?: string;
  creator?: string;
  sourceType?: string;
  error?: string;
}

interface SetupResponse {
  ok: boolean;
}

interface Props {
  onSourceAdded: () => void;
}

// ── Inline SVG icons ──
function YouTubeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
      <rect x="1" y="3" width="13" height="9" rx="2.5" fill="#FF0000"/>
      <polygon points="6,5.5 10.5,7.5 6,9.5" fill="white"/>
    </svg>
  );
}

function ArticleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
      <rect x="2" y="2" width="11" height="11" rx="1.5" stroke="#7b97b5" strokeWidth="1.2"/>
      <line x1="4" y1="5" x2="11" y2="5"  stroke="#7b97b5" strokeWidth="1" strokeLinecap="round"/>
      <line x1="4" y1="7.5" x2="11" y2="7.5" stroke="#7b97b5" strokeWidth="1" strokeLinecap="round"/>
      <line x1="4" y1="10" x2="8"  y2="10"  stroke="#7b97b5" strokeWidth="1" strokeLinecap="round"/>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M2 6l3 3 5-5.5" stroke="#22c55e" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin" width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
      <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="20 10"/>
    </svg>
  );
}

// Shared input styles
const inputCls = [
  "w-full rounded-lg px-3 py-2.5 text-[12.5px] text-[#e4edf8]",
  "placeholder-[#4a5c6e] focus:outline-none transition-colors duration-150",
].join(" ");

// ── Component ──
export default function SourcePanel({ onSourceAdded }: Props) {
  const [url, setUrl]             = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlResult, setUrlResult] = useState<{ ok: boolean; message: string } | null>(null);

  const [noteOpen, setNoteOpen]   = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteLoading, setNoteLoading] = useState(false);
  const [noteResult, setNoteResult] = useState<{ ok: boolean; message: string } | null>(null);

  const setupCalledRef = useRef(false);

  const callSetup = useCallback(async () => {
    if (setupCalledRef.current) return;
    setupCalledRef.current = true;
    try {
      await fetchJson<SetupResponse>("/api/setup", { method: "POST", body: "{}" });
    } catch { /* idempotent */ }
  }, []);

  const handleAddUrl = useCallback(async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setUrlLoading(true);
    setUrlResult(null);
    try {
      await callSetup();
      const data = await fetchJson<SourceResponse>("/api/sources", {
        method: "POST",
        body: JSON.stringify({ url: trimmed }),
      });
      if (data.ok) {
        const who  = data.creator ? ` by ${data.creator}` : "";
        const what = data.title ?? trimmed;
        setUrlResult({ ok: true, message: `Remembered: "${what}"${who}` });
        setUrl("");
        onSourceAdded();
      } else {
        setUrlResult({ ok: false, message: data.error ?? "Something went wrong." });
      }
    } catch (err) {
      setUrlResult({ ok: false, message: err instanceof Error ? err.message : String(err) });
    } finally {
      setUrlLoading(false);
    }
  }, [url, callSetup, onSourceAdded]);

  const handleAddNote = useCallback(async () => {
    const content = noteContent.trim();
    if (!content) return;
    setNoteLoading(true);
    setNoteResult(null);
    try {
      await callSetup();
      const body: Record<string, string> = { text: content, kind: "note" };
      if (noteTitle.trim()) body.title = noteTitle.trim();
      const data = await fetchJson<SourceResponse>("/api/sources", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (data.ok) {
        const what = data.title ?? noteTitle.trim() ?? "Note";
        setNoteResult({ ok: true, message: `Remembered: "${what}"` });
        setNoteContent("");
        setNoteTitle("");
        onSourceAdded();
      } else {
        setNoteResult({ ok: false, message: data.error ?? "Something went wrong." });
      }
    } catch (err) {
      setNoteResult({ ok: false, message: err instanceof Error ? err.message : String(err) });
    } finally {
      setNoteLoading(false);
    }
  }, [noteTitle, noteContent, callSetup, onSourceAdded]);

  const yt = url.trim() ? isYouTube(url.trim()) : null;

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 space-y-5 bg-[#0d1320]">

      {/* ── URL section ── */}
      <section className="space-y-2.5">
        {/* Section header */}
        <div
          className="flex items-center gap-2 text-[10.5px] font-medium text-[#7b97b5] tracking-[0.08em] uppercase"
          style={{ fontFamily: "var(--font-space-grotesk, var(--font-geist-sans))" }}
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden>
            <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.1"/>
            <path d="M3.5 5.5h4M5.5 3.5v4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
          </svg>
          Add URL
        </div>

        {/* Input with icon overlay */}
        <div className="relative">
          {yt !== null && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              {yt ? <YouTubeIcon /> : <ArticleIcon />}
            </span>
          )}
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddUrl()}
            placeholder="https://youtube.com/… or https://blog.example.com/…"
            aria-label="Source URL"
            className={`${inputCls} ${yt !== null ? "pl-9" : "pl-3"}`}
            style={{
              background: "#111928",
              border:     "1px solid #253548",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#f59e0b66")}
            onBlur={(e)  => (e.currentTarget.style.borderColor = "#253548")}
          />
        </div>

        {/* Add button */}
        <button
          onClick={handleAddUrl}
          disabled={!url.trim() || urlLoading}
          aria-label="Add URL to knowledge graph"
          className="w-full rounded-lg py-2.5 text-[12px] font-semibold transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-35 disabled:cursor-not-allowed"
          style={{
            background: "#f59e0b",
            color:      "#080c14",
          }}
          onMouseEnter={(e) => {
            if (!e.currentTarget.disabled)
              e.currentTarget.style.background = "#fbbf24";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#f59e0b";
          }}
        >
          {urlLoading ? (
            <><SpinnerIcon /> Adding…</>
          ) : (
            "Add to Memory"
          )}
        </button>

        {/* URL result */}
        {urlResult && (
          <div
            className={`flex items-start gap-2 rounded-lg px-3 py-2.5 text-[11.5px] leading-relaxed ${
              urlResult.ok
                ? "text-[#22c55e]"
                : "text-[#f87171]"
            }`}
            style={{
              background: urlResult.ok ? "rgba(34,197,94,0.08)"  : "rgba(248,113,113,0.08)",
              border:     urlResult.ok ? "1px solid rgba(34,197,94,0.2)" : "1px solid rgba(248,113,113,0.2)",
            }}
          >
            {urlResult.ok && <CheckIcon />}
            <span>{urlResult.message}</span>
          </div>
        )}
      </section>

      {/* Divider */}
      <div className="border-t border-[#1c2a3f]" />

      {/* ── Note section ── */}
      <section className="space-y-2.5">
        <button
          onClick={() => setNoteOpen((o) => !o)}
          className="flex items-center gap-2 w-full text-[10.5px] font-medium text-[#7b97b5] tracking-[0.08em] uppercase hover:text-[#e4edf8] transition-colors duration-150 cursor-pointer"
          style={{ fontFamily: "var(--font-space-grotesk, var(--font-geist-sans))" }}
          aria-expanded={noteOpen}
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 11 11"
            fill="none"
            aria-hidden
            className={`transition-transform duration-200 ${noteOpen ? "rotate-90" : ""}`}
          >
            <path d="M3.5 2l4 3.5-4 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Paste a note
        </button>

        {noteOpen && (
          <div className="space-y-2 pt-0.5">
            <input
              type="text"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="Title (optional)"
              aria-label="Note title"
              className={inputCls}
              style={{
                background: "#111928",
                border:     "1px solid #253548",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#f59e0b66")}
              onBlur={(e)  => (e.currentTarget.style.borderColor = "#253548")}
            />
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Paste your note, thesis, or research here…"
              rows={5}
              aria-label="Note content"
              className={`${inputCls} resize-none`}
              style={{
                background: "#111928",
                border:     "1px solid #253548",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#f59e0b66")}
              onBlur={(e)  => (e.currentTarget.style.borderColor = "#253548")}
            />
            <button
              onClick={handleAddNote}
              disabled={!noteContent.trim() || noteLoading}
              aria-label="Save note to knowledge graph"
              className="w-full rounded-lg py-2.5 text-[12px] font-semibold transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-35 disabled:cursor-not-allowed"
              style={{
                background: "#111928",
                border:     "1px solid rgba(34,197,94,0.35)",
                color:      "#22c55e",
              }}
              onMouseEnter={(e) => {
                if (!e.currentTarget.disabled)
                  e.currentTarget.style.background = "#162035";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#111928";
              }}
            >
              {noteLoading ? (
                <><SpinnerIcon /> Saving…</>
              ) : (
                "Save Note"
              )}
            </button>

            {noteResult && (
              <div
                className={`flex items-start gap-2 rounded-lg px-3 py-2.5 text-[11.5px] leading-relaxed ${
                  noteResult.ok ? "text-[#22c55e]" : "text-[#f87171]"
                }`}
                style={{
                  background: noteResult.ok ? "rgba(34,197,94,0.08)"  : "rgba(248,113,113,0.08)",
                  border:     noteResult.ok ? "1px solid rgba(34,197,94,0.2)" : "1px solid rgba(248,113,113,0.2)",
                }}
              >
                {noteResult.ok && <CheckIcon />}
                <span>{noteResult.message}</span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Tip ── */}
      <p className="text-[10.5px] text-[#4a5c6e] leading-relaxed pt-1">
        YouTube videos and blog articles are auto-detected and transcribed.
        Notes are ingested as raw text.
        Cognee processes them into the knowledge graph in the background.
      </p>
    </div>
  );
}
