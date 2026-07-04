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
      <rect x="2" y="2" width="11" height="11" rx="1.5" stroke="#7d8fa8" strokeWidth="1.2"/>
      <line x1="4" y1="5" x2="11" y2="5"  stroke="#7d8fa8" strokeWidth="1" strokeLinecap="round"/>
      <line x1="4" y1="7.5" x2="11" y2="7.5" stroke="#7d8fa8" strokeWidth="1" strokeLinecap="round"/>
      <line x1="4" y1="10" x2="8"  y2="10"  stroke="#7d8fa8" strokeWidth="1" strokeLinecap="round"/>
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
  "w-full rounded-xl px-3.5 py-2.5 text-[12.5px]",
  "focus:outline-none",
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

  const inputStyle = {
    background: "#0b1120",
    border: "1px solid #1a3050",
    color: "#d8e3f2",
    transition: "border-color 200ms ease, box-shadow 200ms ease",
  };
  const inputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = "rgba(37,99,235,0.5)";
    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.08)";
  };
  const inputBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = "#1a3050";
    e.currentTarget.style.boxShadow = "none";
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 space-y-5" style={{ background: "#070c14" }}>

      {/* ── URL section ── */}
      <section className="space-y-3">
        {/* Section header — Cantor8-style label */}
        <div className="flex items-center gap-2">
          <div className="w-1 h-3.5 rounded-full" style={{ background: "#2563eb" }} />
          <span
            className="text-[9.5px] font-semibold tracking-[0.16em] uppercase"
            style={{
              color: "#56738e",
              fontFamily: "var(--font-space-grotesk, var(--font-geist-sans))",
            }}
          >
            Add URL
          </span>
        </div>

        {/* Input with icon overlay */}
        <div className="relative">
          {yt !== null && (
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
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
            className={`${inputCls} ${yt !== null ? "pl-9" : ""}`}
            style={{ ...inputStyle, ...(yt !== null ? { paddingLeft: "2.25rem" } : {}) }}
            onFocus={inputFocus}
            onBlur={inputBlur}
          />
        </div>

        {/* Add button — blue CTA with glow */}
        <button
          onClick={handleAddUrl}
          disabled={!url.trim() || urlLoading}
          aria-label="Add URL to knowledge graph"
          className="w-full rounded-xl py-2.5 text-[12px] font-semibold flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: "#2563eb",
            color: "#e8f0ff",
            border: "1px solid transparent",
            transition: "all 200ms cubic-bezier(0.32,0.72,0,1)",
          }}
          onMouseEnter={(e) => {
            if (!e.currentTarget.disabled) {
              e.currentTarget.style.background = "#3b82f6";
              e.currentTarget.style.boxShadow = "0 0 20px rgba(37,99,235,0.45)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#2563eb";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          {urlLoading ? (
            <><SpinnerIcon /> Adding…</>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
              Add to Memory
            </>
          )}
        </button>

        {/* URL result */}
        {urlResult && (
          <div
            className={`flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-[11.5px] leading-relaxed ${
              urlResult.ok ? "text-[#22c55e]" : "text-[#f87171]"
            }`}
            style={{
              background: urlResult.ok ? "rgba(34,197,94,0.07)"  : "rgba(248,113,113,0.07)",
              border:     urlResult.ok ? "1px solid rgba(34,197,94,0.18)" : "1px solid rgba(248,113,113,0.18)",
            }}
          >
            {urlResult.ok && <CheckIcon />}
            <span>{urlResult.message}</span>
          </div>
        )}
      </section>

      {/* Divider */}
      <div style={{ borderTop: "1px solid #112238" }} />

      {/* ── Note section ── */}
      <section className="space-y-3">
        <button
          onClick={() => setNoteOpen((o) => !o)}
          className="flex items-center gap-2 w-full cursor-pointer"
          style={{ fontFamily: "var(--font-space-grotesk, var(--font-geist-sans))" }}
          aria-expanded={noteOpen}
        >
          <div
            className="w-1 h-3.5 rounded-full"
            style={{
              background: noteOpen ? "#2563eb" : "#1a3050",
              transition: "background 200ms ease",
            }}
          />
          <span
            className="text-[9.5px] font-semibold tracking-[0.16em] uppercase"
            style={{ color: noteOpen ? "#56738e" : "#2d4460", transition: "color 150ms ease" }}
          >
            Paste a Note
          </span>
          <svg
            width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden
            style={{
              color: "#2d4460",
              transform: noteOpen ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 200ms cubic-bezier(0.32,0.72,0,1)",
            }}
          >
            <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
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
              style={inputStyle}
              onFocus={inputFocus}
              onBlur={inputBlur}
            />
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Paste your note, thesis, or research here…"
              rows={5}
              aria-label="Note content"
              className={`${inputCls} resize-none`}
              style={inputStyle}
              onFocus={inputFocus}
              onBlur={inputBlur}
            />
            <button
              onClick={handleAddNote}
              disabled={!noteContent.trim() || noteLoading}
              aria-label="Save note to knowledge graph"
              className="w-full rounded-xl py-2.5 text-[12px] font-semibold flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: "#0b1120",
                border: "1px solid rgba(34,197,94,0.3)",
                color: "#22c55e",
                transition: "background 200ms ease",
              }}
              onMouseEnter={(e) => {
                if (!e.currentTarget.disabled)
                  e.currentTarget.style.background = "#0f1c2e";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#0b1120";
              }}
            >
              {noteLoading ? <><SpinnerIcon /> Saving…</> : "Save Note"}
            </button>

            {noteResult && (
              <div
                className={`flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-[11.5px] leading-relaxed ${
                  noteResult.ok ? "text-[#22c55e]" : "text-[#f87171]"
                }`}
                style={{
                  background: noteResult.ok ? "rgba(34,197,94,0.07)" : "rgba(248,113,113,0.07)",
                  border:     noteResult.ok ? "1px solid rgba(34,197,94,0.18)" : "1px solid rgba(248,113,113,0.18)",
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
      <p className="text-[10.5px] leading-relaxed pt-1" style={{ color: "#2d4460" }}>
        YouTube videos and blog articles are auto-detected and transcribed.
        Notes are ingested as raw text.
        Cognee processes them into the knowledge graph in the background.
      </p>
    </div>
  );
}
