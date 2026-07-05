"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { fetchJson } from "@/app/hooks/useApi";
import SpinnerIcon from "@/app/components/Spinner";

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

interface SourceItem {
  id: string;
  name: string;
  createdAt: string;
}

interface SourceListResponse {
  ok: boolean;
  items?: SourceItem[];
}

// Filenames are slugs ("why-i-sold-my-flat") — turn back into readable text
function prettifyName(name: string): string {
  const s = name.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").trim();
  return s ? s[0].toUpperCase() + s.slice(1) : name;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
  const [addUrlHovered, setAddUrlHovered] = useState(false);

  const [noteOpen, setNoteOpen]   = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteLoading, setNoteLoading] = useState(false);
  const [noteResult, setNoteResult] = useState<{ ok: boolean; message: string } | null>(null);

  const [sources, setSources] = useState<SourceItem[]>([]);
  const [sourcesLoaded, setSourcesLoaded] = useState(false);
  const refetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setupCalledRef = useRef(false);

  const loadSources = useCallback(async () => {
    try {
      const data = await fetchJson<SourceListResponse>("/api/sources");
      if (data.ok && data.items) setSources(data.items);
    } catch {
      // best-effort list; the add form still works without it
    } finally {
      setSourcesLoaded(true);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSources();
    return () => {
      if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
    };
  }, [loadSources]);

  // Cognee registers the data record shortly after /remember returns, so
  // refresh once immediately and once again after the pipeline catches up.
  const refreshSourcesAfterAdd = useCallback(() => {
    loadSources();
    if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
    refetchTimerRef.current = setTimeout(loadSources, 8000);
  }, [loadSources]);

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
        refreshSourcesAfterAdd();
      } else {
        setUrlResult({ ok: false, message: data.error ?? "Something went wrong." });
      }
    } catch (err) {
      setUrlResult({ ok: false, message: err instanceof Error ? err.message : String(err) });
    } finally {
      setUrlLoading(false);
    }
  }, [url, callSetup, onSourceAdded, refreshSourcesAfterAdd]);

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
        refreshSourcesAfterAdd();
      } else {
        setNoteResult({ ok: false, message: data.error ?? "Something went wrong." });
      }
    } catch (err) {
      setNoteResult({ ok: false, message: err instanceof Error ? err.message : String(err) });
    } finally {
      setNoteLoading(false);
    }
  }, [noteTitle, noteContent, callSetup, onSourceAdded, refreshSourcesAfterAdd]);

  const yt = url.trim() ? isYouTube(url.trim()) : null;

  const inputStyle = useMemo(() => ({
    background: "#0f0f12",
    border: "1px solid #1a1a1f",
    color: "#ffffff",
    transition: "border-color 200ms ease, box-shadow 200ms ease",
  }), []);
  const inputFocus = useMemo(() => (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = "#1d3be0";
    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(29,59,224,0.15)";
  }, []);
  const inputBlur = useMemo(() => (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = "#1a1a1f";
    e.currentTarget.style.boxShadow = "none";
  }, []);

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 space-y-5" style={{ background: "#0a0a0d" }}>

      {/* ── Existing sources ── */}
      {sourcesLoaded && sources.length > 0 && (
        <section className="space-y-3">
          <span
            className="uppercase"
            style={{
              fontFamily: "var(--font-geist-mono)",
              fontSize: "12px",
              letterSpacing: "0.2em",
              color: "rgba(255,255,255,0.4)",
            }}
          >
            → YOUR SOURCES ({sources.length})
          </span>

          <ul
            className="space-y-1 max-h-44 overflow-y-auto rounded-xl p-1.5"
            style={{ background: "#0f0f12", border: "1px solid #1a1a1f" }}
          >
            {sources.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-2.5 rounded-lg px-2 py-1.5"
              >
                <span className="flex-shrink-0">
                  <ArticleIcon />
                </span>
                <span
                  className="flex-1 min-w-0 truncate text-[12px]"
                  style={{ color: "rgba(255,255,255,0.8)" }}
                  title={prettifyName(s.name)}
                >
                  {prettifyName(s.name)}
                </span>
                <span
                  className="flex-shrink-0 text-[10px] font-mono tabular-nums"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  {formatDate(s.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── URL section ── */}
      <section className="space-y-3">
        {/* Section header — micro-label eyebrow */}
        <span
          className="uppercase"
          style={{
            fontFamily: "var(--font-geist-mono)",
            fontSize: "12px",
            letterSpacing: "0.2em",
            color: "rgba(255,255,255,0.4)",
          }}
        >
          → ADD URL
        </span>

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

        {/* Add button — signature button-in-button */}
        <button
          type="button"
          onClick={handleAddUrl}
          disabled={!url.trim() || urlLoading}
          aria-label="Add URL to knowledge graph"
          className="w-full flex items-stretch rounded-[6px] overflow-hidden h-[42px] cursor-pointer active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: "#ffffff",
            border: "none",
            transition: "transform 200ms cubic-bezier(0.32,0.72,0,1)",
          }}
          onMouseEnter={() => setAddUrlHovered(true)}
          onMouseLeave={() => setAddUrlHovered(false)}
        >
          <span className="flex-1 flex items-center justify-center gap-2 text-[12px] font-semibold" style={{ color: "#000000" }}>
            {urlLoading ? (
              <><SpinnerIcon /> Adding…</>
            ) : (
              <>Add to Memory</>
            )}
          </span>
          <span
            className="flex items-center justify-center w-[42px]"
            style={{
              background: "#1d3be0",
              transform: addUrlHovered ? "translate(1px,-1px)" : "translate(0,0)",
              transition: "transform 200ms cubic-bezier(0.32,0.72,0,1)",
            }}
          >
            <span style={{ color: "#ffffff", fontSize: "15px", lineHeight: 1 }}>↗</span>
          </span>
        </button>

        {/* URL result */}
        {urlResult && (
          <div
            className={`flex items-start gap-2 rounded-[6px] px-3.5 py-2.5 text-[11.5px] leading-relaxed ${
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
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }} />

      {/* ── Note section ── */}
      <section className="space-y-3">
        <button
          type="button"
          onClick={() => setNoteOpen((o) => !o)}
          className="flex items-center gap-2 w-full cursor-pointer"
          aria-expanded={noteOpen}
        >
          <span
            className="uppercase"
            style={{
              fontFamily: "var(--font-geist-mono)",
              fontSize: "12px",
              letterSpacing: "0.2em",
              color: noteOpen ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.4)",
              transition: "color 150ms ease",
            }}
          >
            → PASTE A NOTE
          </span>
          <svg
            width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden
            style={{
              color: "rgba(255,255,255,0.4)",
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
              type="button"
              onClick={handleAddNote}
              disabled={!noteContent.trim() || noteLoading}
              aria-label="Save note to knowledge graph"
              className="w-full rounded-[6px] py-2.5 text-[12px] font-semibold flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: "#0f0f12",
                border: "1px solid rgba(34,197,94,0.35)",
                color: "#22c55e",
                transition: "background 200ms ease",
              }}
              onMouseEnter={(e) => {
                if (!e.currentTarget.disabled)
                  e.currentTarget.style.background = "#16161a";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#0f0f12";
              }}
            >
              {noteLoading ? <><SpinnerIcon /> Saving…</> : "Save Note"}
            </button>

            {noteResult && (
              <div
                className={`flex items-start gap-2 rounded-[6px] px-3.5 py-2.5 text-[11.5px] leading-relaxed ${
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
      <p className="text-[10.5px] leading-relaxed pt-1" style={{ color: "rgba(255,255,255,0.25)" }}>
        YouTube videos and blog articles are auto-detected and transcribed.
        Notes are ingested as raw text.
        Cognee processes them into the knowledge graph in the background.
      </p>
    </div>
  );
}
